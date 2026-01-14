pipeline {
    /* ===================== AGENT ===================== */
    agent { label 'builtin-linux' }   // Force Linux Built-in Node

    /* ===================== ENV ===================== */
    environment {
        DOCKER_IMAGE_BACKEND  = 'moa-agriplan-backend'
        DOCKER_IMAGE_FRONTEND = 'moa-agriplan-frontend'
        DOCKER_TAG = "${BUILD_NUMBER}"

        REMOTE_SERVER = '10.10.20.233'
        REMOTE_USER   = 'moapms'
        REMOTE_PATH   = '/home/moapms/moa-planning-system'

        DJANGO_SETTINGS_MODULE = 'moa_agriplan_system.settings'
        PYTHONUNBUFFERED = '1'
    }

    /* ===================== STAGES ===================== */
    stages {

        /* ---------- CHECKOUT ---------- */
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        /* ===================== BACKEND ===================== */

        stage('Lint Backend') {
            agent {
                docker {
                    image 'python:3.11'
                    reuseNode true
                }
            }
            steps {
                dir('backend') {
                    sh '''
                        pip install --no-cache-dir -r requirements.txt flake8
                        flake8 . || true
                    '''
                }
            }
        }

        stage('Test Backend') {
            agent {
                docker {
                    image 'python:3.11'
                    reuseNode true
                }
            }
            steps {
                dir('backend') {
                    sh '''
                        pip install --no-cache-dir -r requirements.txt
                        python manage.py test --verbosity=2
                    '''
                }
            }
        }

        /* ===================== FRONTEND ===================== */

        stage('Lint Frontend') {
            agent {
                docker {
                    image 'node:18'
                    reuseNode true
                }
            }
            steps {
                dir('frontend/planning-vite') {
                    sh '''
                        npm install
                        npm run lint || true
                    '''
                }
            }
        }

        stage('Test Frontend') {
            agent {
                docker {
                    image 'node:18'
                    reuseNode true
                }
            }
            steps {
                dir('frontend/planning-vite') {
                    sh '''
                        npm install
                        npm test -- --watchAll=false || true
                    '''
                }
            }
        }

        /* ===================== DOCKER BUILD ===================== */

        stage('Build Docker Images') {
            parallel {

                stage('Build Backend Image') {
                    steps {
                        dir('backend') {
                            script {
                                docker.build("${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG}")
                                docker.build("${DOCKER_IMAGE_BACKEND}:latest")
                            }
                        }
                    }
                }

                stage('Build Frontend Image') {
                    steps {
                        dir('frontend/planning-vite') {
                            script {
                                docker.build("${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG}")
                                docker.build("${DOCKER_IMAGE_FRONTEND}:latest")
                            }
                        }
                    }
                }
            }
        }

        /* ===================== DEPLOY ===================== */

        stage('Deploy to Production') {
            when { branch 'main' }
            steps {
                input message: "Deploy to production (${REMOTE_SERVER})?", ok: 'Deploy'

                sshagent(['moapms-ssh-key']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_SERVER} << 'EOF'
                        set -e
                        mkdir -p ${REMOTE_PATH}
                        cd ${REMOTE_PATH}

                        if [ ! -d ".git" ]; then
                            git clone https://github.com/lidu5/planning-system.git .
                        else
                            git pull origin main
                        fi

                        docker compose -f docker-compose.prod.yml down
                        docker compose -f docker-compose.prod.yml up -d --build

                        docker exec moa-backend-prod python manage.py migrate --noinput
                        docker exec moa-backend-prod python manage.py collectstatic --noinput
                    EOF
                    """
                }
            }
        }

        /* ===================== HEALTH CHECK ===================== */

        stage('Health Check') {
            when { branch 'main' }
            steps {
                sh '''
                    sleep 30
                    curl -f http://${REMOTE_SERVER}:8080
                    echo "✅ Health check passed"
                '''
            }
        }
    }

    /* ===================== POST ===================== */
    post {
        always {
            cleanWs()
            sh '''
                docker image prune -f || true
                docker volume prune -f || true
            '''
        }

        success {
            echo '✅ Pipeline succeeded!'
        }

        failure {
            echo '❌ Pipeline failed!'
        }
    }
}
