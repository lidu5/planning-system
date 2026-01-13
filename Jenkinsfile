pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-creds')
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/lidu5/planning-system.git'
            }
        }

        stage('Build Backend Image') {
            steps {
                script {
                    docker.build("myapp-backend:${env.BUILD_NUMBER}", "./backend")
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                script {
                    docker.build("myapp-frontend:${env.BUILD_NUMBER}", "./frontend")
                }
            }
        }

        stage('Push Images') {
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', DOCKERHUB_CREDENTIALS) {
                        docker.image("myapp-backend:${env.BUILD_NUMBER}").push()
                        docker.image("myapp-frontend:${env.BUILD_NUMBER}").push()
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker compose down && docker compose up -d --build'
            }
        }
    }
}