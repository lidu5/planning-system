pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = '' // Set your Docker registry if needed
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
        
        stage('Lint Backend') {
            steps {
                dir('backend') {
                    sh '''
                        python -m venv venv
                        . venv/bin/activate
                        pip install -r requirements.txt
                        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
                        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
                    '''
                }
            }
        }
        
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
        
        stage('Test Backend') {
            steps {
                dir('backend') {
                    sh '''
                        python -m venv venv
                        . venv/bin/activate
                        pip install -r requirements.txt
                        python manage.py test
                        python manage.py check --deploy
                    '''
                }
            }
        }
        
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
        
        stage('Build Docker Images') {
            parallel {
                stage('Build Backend') {
                    steps {
                        dir('backend') {
                            script {
                                docker.build("${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG}", ".")
                                docker.build("${DOCKER_IMAGE_BACKEND}:latest", ".")
                            }
                        }
                    }
                }
                
                stage('Build Frontend') {
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
        
        stage('Security Scan') {
            steps {
                script {
                    // Run security scans on Docker images
                    sh '''
                        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                            aquasec/trivy:latest image ${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG}
                        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                            aquasec/trivy:latest image ${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG}
                    '''
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    // Deploy to staging environment
                    sh '''
                        docker-compose -f docker-compose.staging.yml down
                        docker-compose -f docker-compose.staging.yml up -d
                    '''
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                script {
                    // Deploy to production environment
                    sh '''
                        docker-compose -f docker-compose.prod.yml down
                        docker-compose -f docker-compose.prod.yml up -d
                    '''
                }
            }
        }
    }
    
    post {
        always {
            // Clean up workspace
            cleanWs()
        }
        
        success {
            echo 'Pipeline succeeded!'
            
            // Send notifications (configure as needed)
            // slackSend(color: 'good', message: "Pipeline succeeded for ${env.JOB_NAME} - ${env.BUILD_NUMBER}")
        }
        
        failure {
            echo 'Pipeline failed!'
            
            // Send notifications (configure as needed)
            // slackSend(color: 'danger', message: "Pipeline failed for ${env.JOB_NAME} - ${env.BUILD_NUMBER}")
        }
        
        unstable {
            echo 'Pipeline is unstable!'
        }
    }
}
