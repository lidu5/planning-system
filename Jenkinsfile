pipeline {
    agent {
        label 'builtin-linux'
    }

    environment {
        DOCKER_IMAGE_BACKEND = 'moa-agriplan-backend'
        DOCKER_IMAGE_FRONTEND = 'moa-agriplan-frontend'
        DOCKER_TAG = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        /* ================= BACKEND ================= */

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
                        python --version
                        pip install --upgrade pip
                        pip install -r requirements.txt flake8
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
                        pip install -r requirements.txt
                        python manage.py test
                    '''
                }
            }
        }

        /* ================= FRONTEND ================= */

        stage('Lint Frontend') {
            agent {
                docker {
                    image 'node:18'
                    reuseNode true
                }
            }
            steps {
                dir('frontend') {
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
                dir('frontend') {
                    sh '''
                        npm test -- --watch=false || true
                    '''
                }
            }
        }

        /* ================= DOCKER BUILD ================= */

        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build -t ${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG} backend
                    docker build -t ${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG} frontend
                '''
            }
        }
    }

    post {
        always {
            cleanWs()
            sh 'docker image prune -f || true'
            sh 'docker volume prune -f || true'
        }

        success {
            echo '✅ Pipeline succeeded'
        }

        failure {
            echo '❌ Pipeline failed'
        }
    }
}
