#!/bin/bash

# MOA Agricultural Planning System Deployment Script
# For Ubuntu 22.04.2 LTS Server

set -e

echo "🚀 Starting MOA Agricultural Planning System Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as moapms user
if [ "$USER" != "moapms" ]; then
    print_error "This script must be run as moapms user"
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
fi

# Add user to docker group
sudo usermod -aG docker moapms

# Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install other required tools
print_status "Installing additional tools..."
sudo apt install -y git htop nginx certbot python3-certbot-nginx

# Create project directory
print_status "Creating project directory..."
PROJECT_DIR="/home/moapms/moa-planning-system"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Clone repository (replace with your actual repository URL)
if [ ! -d ".git" ]; then
    print_status "Cloning repository..."
    # Uncomment and modify the line below with your actual repository
    # git clone https://github.com/your-username/planning-system.git .
    print_warning "Please clone your repository manually: git clone <your-repo-url> ."
fi

# Create production environment file
print_status "Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_warning "Please edit .env file with your production settings:"
    print_warning "  - SECRET_KEY: Generate a new secret key"
    print_warning "  - DB_PASSWORD: Set a secure database password"
    print_warning "  - ALLOWED_HOSTS: Set your domain name"
fi

# Generate Django secret key
print_status "Generating Django secret key..."
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
sed -i "s/SECRET_KEY=your-secret-key-here/SECRET_KEY=$SECRET_KEY/" .env

# Set production settings
sed -i 's/DEBUG=False/DEBUG=False/' .env
sed -i 's/ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com/ALLOWED_HOSTS=10.10.20.233/' .env

# Create nginx configuration
print_status "Setting up Nginx for port 8080..."
sudo tee /etc/nginx/sites-available/moa-planning-system << 'EOF'
server {
    listen 8080;
    server_name 10.10.20.233;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django admin
    location /admin/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /home/moapms/moa-planning-system/backend/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /home/moapms/moa-planning-system/backend/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/moa-planning-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Create systemd service for auto-restart
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/moa-planning-system.service << 'EOF'
[Unit]
Description=MOA Agricultural Planning System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/moapms/moa-planning-system
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable moa-planning-system.service

# Create backup script
print_status "Creating backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash

# Backup script for MOA Agricultural Planning System
BACKUP_DIR="/home/moapms/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/home/moapms/moa-planning-system"

mkdir -p $BACKUP_DIR

# Backup database
docker exec moa-db-prod pg_dump -U postgres moa_production > $BACKUP_DIR/db_backup_$DATE.sql

# Backup media files
tar -czf $BACKUP_DIR/media_backup_$DATE.tar.gz -C $PROJECT_DIR backend/media/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# Setup cron job for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/moapms/moa-planning-system/backup.sh") | crontab -

print_status "Deployment setup completed!"
echo ""
echo -e "${GREEN}🎉 Next steps:${NC}"
echo "1. Edit .env file with your actual settings"
echo "2. Clone your repository: git clone <your-repo-url> ."
echo "3. Run: docker-compose -f docker-compose.prod.yml up -d"
echo "4. Check logs: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Set a strong database password in .env"
echo "- Configure your domain name in ALLOWED_HOSTS"
echo "- Consider setting up SSL with Let's Encrypt"
echo ""
echo -e "${GREEN}🚀 Your application will be available at:${NC}"
echo "http://10.10.20.233:8080"
