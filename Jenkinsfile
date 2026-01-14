pipeline {
    agent {
        label 'builtin-linux'
    }

    environment {
        DOCKER_IMAGE_BACKEND = 'moa-agriplan-backend'
        DOCKER_IMAGE_FRONTEND = 'moa-agriplan-frontend'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/lidu5/planning-system.git',
                    credentialsId: 'moapms-ssh-key'
            }
        }

        stage('Lint Backend') {
            steps {
                dir('backend') {
                    // Use system Python installed on server
                    sh 'python3 --version'
                    sh 'pip3 install --user --upgrade pip flake8'
                    sh 'flake8 .'
                }
            }
        }

        stage('Test Backend') {
            steps {
                dir('backend') {
                    sh 'python3 -m unittest discover tests'
                }
            }
        }

        stage('Lint Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run lint'
                }
            }
        }

        stage('Test Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm test'
                }
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Build Backend Image') {
                    steps {
                        dir('backend') {
                            sh "docker build -t ${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG} ."
                        }
                    }
                }
                stage('Build Frontend Image') {
                    steps {
                        dir('frontend') {
                            sh "docker build -t ${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG} ."
                        }
                    }
                }
            }
        }

        stage('Deploy to Production') {
            steps {
                echo 'Deployment stage: implement your deploy commands here'
            }
        }

        stage('Health Check') {
            steps {
                echo 'Health Check stage: implement your health checks here'
            }
        }
    }

    post {
        always {
            cleanWs()
            sh 'docker image prune -f'
            sh 'docker volume prune -f'
            echo "❌ Pipeline finished!"
        }
    }
}
