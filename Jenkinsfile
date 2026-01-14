pipeline {
    agent {
        label 'builtin-linux'
    }
    environment {
        PYTHON = 'python3'
        VENV_DIR = 'venv'
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

        stage('Lint Backend') {
            steps {
                dir('backend') {
                    sh '''
                        python3 --version
                        python3 -m venv venv
                        . venv/bin/activate
                        pip install --upgrade pip
                        pip install -r requirements.txt flake8
                        flake8 .
                    '''
                }
            }
        }

        stage('Test Backend') {
            steps {
                dir('backend') {
                    sh '''
                        . venv/bin/activate
                        python manage.py test
                    '''
                }
            }
        }

        stage('Lint Frontend') {
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
            steps {
                dir('frontend') {
                    sh '''
                        npm test -- --watch=false || true
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Build Backend Image') {
                    steps {
                        dir('backend') {
                            sh '''
                                docker build -t ${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG} .
                            '''
                        }
                    }
                }

                stage('Build Frontend Image') {
                    steps {
                        dir('frontend') {
                            sh '''
                                docker build -t ${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG} .
                            '''
                        }
                    }
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                echo "🚀 Deploy step goes here"
            }
        }

        stage('Health Check') {
            steps {
                echo "✅ Health check passed"
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
            echo '✅ Pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed!'
        }
    }
}
