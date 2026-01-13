# MOA Agricultural Planning System - Server Deployment Guide

## Server Information
- **Server IP**: 10.10.20.233
- **OS**: Ubuntu 22.04.2 LTS
- **User**: moapms

## Quick Deployment Steps

### 1. Connect to Server
```bash
ssh moapms@10.10.20.233
```

### 2. Upload Project Files
```bash
# On your local machine, upload the project
scp -r /path/to/planning-system moapms@10.10.20.233:~/
```

### 3. Run Deployment Script
```bash
cd ~/planning-system
chmod +x deploy.sh
./deploy.sh
```

### 4. Configure Environment
```bash
# Edit the .env file with production settings
nano .env
```

### 5. Start Application
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Manual Deployment Steps (Alternative)

### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Add user to docker group
sudo usermod -aG docker moapms

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt install -y git nginx certbot python3-certbot-nginx
```

### Setup Project
```bash
# Create project directory
mkdir -p ~/moa-planning-system
cd ~/moa-planning-system

# Clone your repository (replace with actual URL)
git clone <your-repository-url> .

# Setup environment
cp .env.example .env
nano .env  # Edit with production settings
```

### Configure Nginx
```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/moa-planning-system

# Enable site
sudo ln -sf /etc/nginx/sites-available/moa-planning-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### Start Services
```bash
# Start the application
docker-compose -f docker-compose.prod.yml up -d

# Enable auto-start on boot
sudo systemctl enable moa-planning-system.service
```

## Environment Configuration

Edit `.env` file with these settings:

```bash
# Django Settings
SECRET_KEY=generate-new-secret-key-here
DEBUG=False
ALLOWED_HOSTS=10.10.20.233,your-domain.com

# Database Settings
DB_ENGINE=django.db.backends.postgresql
DB_NAME=moa_production
DB_USER=postgres
DB_PASSWORD=secure-database-password
DB_HOST=db-prod
DB_PORT=5432
```

## Access URLs

- **Frontend**: http://10.10.20.233
- **Backend API**: http://10.10.20.233/api/
- **Admin Panel**: http://10.10.20.233/admin/

## Management Commands

### Check Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Update Application
```bash
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Management
```bash
# Run migrations
docker exec moa-backend-prod python manage.py migrate

# Create superuser
docker exec moa-backend-prod python manage.py createsuperuser

# Collect static files
docker exec moa-backend-prod python manage.py collectstatic --noinput
```

### Backup
```bash
# Manual backup
./backup.sh

# View backups
ls -la ~/backups/
```

## SSL Certificate Setup (Optional)

```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Troubleshooting

### Check Docker Status
```bash
sudo systemctl status docker
docker version
```

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Check Application Logs
```bash
# Backend logs
docker logs moa-backend-prod

# Frontend logs
docker logs moa-frontend-prod

# Database logs
docker logs moa-db-prod
```

### Restart Services
```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

## Security Recommendations

1. **Firewall**: Configure UFW firewall
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   ```

2. **Database Security**: Use strong passwords
3. **SSL**: Set up HTTPS with Let's Encrypt
4. **Updates**: Keep system and Docker updated
5. **Backups**: Ensure daily backups are running

## Monitoring

### System Resources
```bash
htop
df -h
free -h
```

### Docker Resources
```bash
docker stats
docker system df
```

### Log Monitoring
```bash
# Real-time logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```
