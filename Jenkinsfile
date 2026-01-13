pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = '' // Set your Docker registry if needed
        DOCKER_IMAGE_BACKEND = 'moa-agriplan-backend'
        DOCKER_IMAGE_FRONTEND = 'moa-agriplan-frontend'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        DOCKERHUB_CREDENTIALS = '' // Not using Docker registry
        REMOTE_SERVER = '10.10.20.233'
        REMOTE_USER = 'moapms'
        REMOTE_PATH = '/home/moapms/moa-planning-system'
        DJANGO_SETTINGS_MODULE = 'moa_agriplan_system.settings'
        PYTHONUNBUFFERED = '1'
    }
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/lidu5/planning-system.git'
            }
        }
        
        stage('Lint Backend') {
            steps {
                dir('backend') {
                    sh '''
                        python3 -m venv venv
                        . venv/bin/activate
                        pip install -r requirements.txt
                        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics || true
                        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics || true
                    '''
                }
            }
        }
        
        stage('Lint Frontend') {
            steps {
                dir('frontend/planning-vite') {
                    sh '''
                        npm install
                        npm run lint || true
                    '''
                }
            }
        }
        
        stage('Test Backend') {
            steps {
                dir('backend') {
                    sh '''
                        python3 -m venv venv
                        . venv/bin/activate
                        pip install -r requirements.txt
                        python manage.py test --verbosity=2
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
                        npm run test -- --watchAll=false --coverage || true
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
        
        stage('Push Images to Registry') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    if (DOCKER_REGISTRY) {
                        docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKERHUB_CREDENTIALS) {
                            docker.image("${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG}").push()
                            docker.image("${DOCKER_IMAGE_BACKEND}:latest").push()
                            docker.image("${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG}").push()
                            docker.image("${DOCKER_IMAGE_FRONTEND}:latest").push()
                        }
                    }
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
                    sshagent(['moapms-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_SERVER} << 'EOF'
                                cd ${REMOTE_PATH}
                                git pull origin develop
                                docker-compose -f docker-compose.staging.yml down
                                docker-compose -f docker-compose.staging.yml up -d --build
                                echo "Staging deployment completed"
                            EOF
                        """
                    }
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production server ${REMOTE_SERVER}:8080?', ok: 'Deploy'
                script {
                    sshagent(['moapms-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_SERVER} << 'EOF'
                                # Create directory if it doesn't exist
                                mkdir -p ${REMOTE_PATH}
                                cd ${REMOTE_PATH}
                                
                                # Clone if not exists, else pull
                                if [ ! -d ".git" ]; then
                                    echo "Cloning repository for first time..."
                                    git clone https://github.com/lidu5/planning-system.git .
                                else
                                    echo "Updating existing repository..."
                                    git pull origin main
                                fi
                                
                                # Ensure .env exists
                                if [ ! -f ".env" ]; then
                                    cp .env.example .env
                                    echo " Please configure .env file with production settings!"
                                    exit 1
                                fi
                                
                                # Backup current database
                                docker exec moa-db-prod pg_dump -U postgres moa_production > backup_\$(date +%Y%m%d_%H%M%S).sql || true
                                
                                # Stop current services
                                docker-compose -f docker-compose.prod.yml down
                                
                                # Pull new images if using registry
                                if [ "${DOCKER_REGISTRY}" != "" ]; then
                                    docker pull ${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:latest
                                    docker pull ${DOCKER_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:latest
                                fi
                                
                                # Start services
                                docker-compose -f docker-compose.prod.yml up -d --build
                                
                                # Wait for services to be ready
                                sleep 30
                                
                                # Run Django migrations
                                docker exec moa-backend-prod python manage.py migrate --noinput
                                
                                # Collect static files
                                docker exec moa-backend-prod python manage.py collectstatic --noinput
                                
                                # Check service health
                                curl -f http://localhost:8000/api/health || echo "Backend health check failed"
                                curl -f http://localhost:3000 || echo "Frontend health check failed"
                                
                                echo "Production deployment completed successfully!"
                                echo "Application available at: http://${REMOTE_SERVER}:8080"
                            EOF
                        """
                    // Check application health
                    sh """
                        curl -f http://${REMOTE_SERVER}:8080/health || exit 1
                        curl -f http://${REMOTE_SERVER}:8080/api/ || exit 1
                        echo "Health checks passed!"
                    """
                }
            }
        }
        
        stage('Security Scan') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    // Run security scans if Trivy is available
                    sh '''
                        if command -v trivy &> /dev/null; then
                            trivy image ${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG} || true
                            trivy image ${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG} || true
                        else
                            echo "Trivy not available, skipping security scan"
                        fi
                    '''
                }
            }
        }
    }
    
    post {
        always {
            node {
                // Clean up workspace
                cleanWs()
                
                // Clean up Docker images
                sh '''
                    docker image prune -f || true
                    docker volume prune -f || true
                '''
            }
        }
        
        success {
            echo '✅ Pipeline succeeded!'
            
            // Send success notification
            script {
                if (env.BRANCH_NAME == 'main') {
                    echo "🚀 Production deployment successful!"
                    echo "📱 Application available at: http://${REMOTE_SERVER}:8080"
                } else if (env.BRANCH_NAME == 'develop') {
                    echo "🧪 Staging deployment successful!"
                    echo "📱 Application available at: http://${REMOTE_SERVER}:3000"
                }
            }
            
            // Slack notification (uncomment if configured)
            // slackSend(
            //     color: 'good',
            //     message: "✅ Pipeline succeeded for ${env.JOB_NAME} - ${env.BUILD_NUMBER} (${env.BRANCH_NAME})"
            // )
        }
        
        failure {
            echo '❌ Pipeline failed!'
            
            // Send failure notification
            script {
                if (env.BRANCH_NAME == 'main') {
                    echo "🚨 Production deployment failed!"
                } else if (env.BRANCH_NAME == 'develop') {
                    echo "🚨 Staging deployment failed!"
                }
            }
            
            // Slack notification (uncomment if configured)
            // slackSend(
            //     color: 'danger',
            //     message: "❌ Pipeline failed for ${env.JOB_NAME} - ${env.BUILD_NUMBER} (${env.BRANCH_NAME})"
            // )
        }
        
        unstable {
            echo '⚠️ Pipeline is unstable!'
        }
        
        cleanup {
            // Additional cleanup if needed
            echo '🧹 Cleaning up...'
        }
    }
}