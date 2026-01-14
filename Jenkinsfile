pipeline {
    agent {
        label 'builtin-linux'
    }

    environment {
        BACKEND_DIR = 'backend'
        FRONTEND_DIR = 'frontend'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/lidu5/planning-system.git',
                    credentialsId: 'moapms-ssh-key',
                    branch: 'main'
            }
        }

        stage('Lint & Test Backend') {
            agent {
                docker {
                    image 'python:3.11'
                    args '-v $WORKSPACE:/app'
                }
            }
            steps {
                dir("${BACKEND_DIR}") {
                    sh '''
                    python3 --version
                    pip install --upgrade pip
                    pip install -r requirements.txt
                    # Lint with flake8 (install if needed)
                    pip install flake8
                    flake8 .
                    # Run tests with pytest
                    pip install pytest
                    pytest
                    '''
                }
            }
        }

        stage('Lint & Test Frontend') {
            agent {
                docker {
                    image 'node:20'
                    args '-v $WORKSPACE:/app'
                }
            }
            steps {
                dir("${FRONTEND_DIR}") {
                    sh '''
                    node -v
                    npm install
                    # Lint frontend (assuming eslint is setup)
                    npx eslint .
                    # Run frontend tests (if any)
                    npm test
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    docker.build("moa-backend:${DOCKER_TAG}", "${BACKEND_DIR}")
                    docker.build("moa-frontend:${DOCKER_TAG}", "${FRONTEND_DIR}")
                }
            }
        }

        stage('Deploy (optional)') {
            steps {
                echo "Deploy step can be implemented here"
                // e.g., docker push, ssh deploy, kubectl apply, etc.
            }
        }
    }

    post {
        always {
            echo 'Cleaning workspace...'
            cleanWs()
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
