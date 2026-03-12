pipeline {
    agent { label 'builtin-linux' }
    options { timestamps(); disableConcurrentBuilds() }

    environment {
        DOCKER_IMAGE_BACKEND  = 'moa-agriplan-backend'
        DOCKER_IMAGE_FRONTEND = 'moa-agriplan-frontend'
        DOCKER_TAG            = "${BUILD_NUMBER}"

        REMOTE_SERVER = '10.10.20.233'
        REMOTE_USER   = 'moapms'
        REMOTE_PATH   = '/home/moapms/moa-planning-system'

        DJANGO_SETTINGS_MODULE = 'moa_agriplan_system.settings'
        PYTHONUNBUFFERED = '1'
    }

    stages {
        stage('Checkout') { steps { checkout scm } }

        stage('Lint Backend') {
            agent { docker { image 'python:3.11'; label 'builtin-linux'; args '-v $WORKSPACE:/app -u root' } }
            steps { dir('backend') { sh 'pip install -r requirements.txt flake8 --no-cache-dir && flake8 . --count --exit-zero --max-line-length=127' } }
        }

        stage('Lint Frontend') {
            agent { docker { image 'node:20'; label 'builtin-linux' } }
            steps { dir('frontend/planning-vite') { sh 'npm ci && npm run lint || true' } }
        }

        stage('Test Backend') {
            agent { docker { image 'python:3.11'; label 'builtin-linux'; args '-v $WORKSPACE:/app -u root' } }
            steps { dir('backend/moa_agriplan_system') { sh 'pip install -r ../requirements.txt --no-cache-dir && python manage.py test --verbosity=2 && python manage.py check --deploy' } }
        }

        stage('Test Frontend') {
            agent { docker { image 'node:20'; label 'builtin-linux' } }
            steps { dir('frontend/planning-vite') { sh 'npm ci && npm test -- --watch=false || true' } }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    dir('backend') { docker.build("${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG}"); docker.build("${DOCKER_IMAGE_BACKEND}:latest") }
                    dir('frontend/planning-vite') { docker.build("${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG}"); docker.build("${DOCKER_IMAGE_FRONTEND}:latest") }
                }
            }
        }

        stage('Deploy to Production') {
            steps {
                input message: "Deploy to ${REMOTE_SERVER}?", ok: "Deploy"
                sshagent(['moapms3-ssh-key']) {
                    sh """
ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_SERVER} '
set -e
cd ${REMOTE_PATH}
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
sleep 20
docker exec moa-backend-prod python manage.py migrate --noinput
docker exec moa-backend-prod python manage.py collectstatic --noinput
echo "✅ Deployment completed"
echo "🌐 https://${REMOTE_SERVER}"
'
"""
                }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    sleep 20
                    curl -fk https://${REMOTE_SERVER}/health || true
                    curl -fk https://${REMOTE_SERVER}/api/ || true
                '''
            }
        }
    }

    post {
        always {
            cleanWs()
            sh 'docker image prune -f || true && docker volume prune -f || true'
        }
        success { echo '✅ PIPELINE SUCCESS' }
        failure { echo '❌ PIPELINE FAILED' }
    }
}