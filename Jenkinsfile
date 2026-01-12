pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = ''
        DOCKER_IMAGE_BACKEND = 'moa-agriplan-backend'
        DOCKER_IMAGE_FRONTEND = 'moa-agriplan-frontend'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        DJANGO_SETTINGS_MODULE = 'moa_agriplan_system.settings'
        PYTHONUNBUFFERED = '1'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        /* =========================
           BACKEND: LINT
        ========================== */
        stage('Lint Backend') {
            steps {
                dir('backend') {
                    sh '''
                        python3 -m venv venv
                        . venv/bin/activate
                        python3 -m pip install --upgrade pip
                        python3 -m pip install -r requirements.txt
                        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
                        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
                    '''
                }
            }
        }

        /* =========================
           FRONTEND: LINT
        ========================== */
        stage('Lint Frontend') {
            steps {
                dir('frontend/planning-vite') {
                    sh '''
                        npm install
                        npm run lint
                    '''
                }
            }
        }

        /* =========================
           BACKEND: TEST
        ========================== */
        stage('Test Backend') {
            steps {
                dir('backend') {
                    sh '''
                        python3 -m venv venv
                        . venv/bin/activate
                        python3 -m pip install --upgrade pip
                        python3 -m pip install -r requirements.txt
                        python3 manage.py test
                        python3 manage.py check --deploy
                    '''
                }
            }
        }

        /* =========================
           FRONTEND: TEST
        ========================== */
        stage('Test Frontend') {
            steps {
                dir('frontend/planning-vite') {
                    sh '''
                        npm install
                        npm run test -- --watchAll=false
                    '''
                }
            }
        }

        /* =========================
           DOCKER BUILDS
        ========================== */
        stage('Build Docker Images') {
            parallel {

                stage('Build Backend Image') {
                    steps {
                        dir('backend') {
                            script {
                                docker.build("${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG}", ".")
                                docker.build("${DOCKER_IMAGE_BACKEND}:latest", ".")
                            }
                        }
                    }
                }

                stage('Build Frontend Image') {
                    steps {
                        dir('frontend/planning-vite') {
                            script {
                                docker.build("${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG}", ".")
                                docker.build("${DOCKER_IMAGE_FRONTEND}:latest", ".")
                            }
                        }
                    }
                }
            }
        }

        /* =========================
           SECURITY SCAN
        ========================== */
        stage('Security Scan') {
            steps {
                sh '''
                    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest image ${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG}

                    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest image ${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG}
                '''
            }
        }

        /* =========================
           DEPLOY TO STAGING
        ========================== */
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh '''
                    docker-compose -f docker-compose.staging.yml down
                    docker-compose -f docker-compose.staging.yml up -d
                '''
            }
        }

        /* =========================
           DEPLOY TO PRODUCTION
        ========================== */
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production server 10.10.20.233:8080?', ok: 'Deploy'

                sshagent(['moapms-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no moapms@10.10.20.233 << 'EOF'
                            cd ~/moa-planning-system
                            git pull origin main
                            docker-compose -f docker-compose.prod.yml down
                            docker-compose -f docker-compose.prod.yml up -d --build
                            echo "Application deployed at http://10.10.20.233:8080"
                        EOF
                    '''
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }

        success {
            echo '✅ Pipeline succeeded!'
        }

        failure {
            echo '❌ Pipeline failed!'
        }

        unstable {
            echo '⚠️ Pipeline is unstable!'
        }
    }
}
