#!/bin/bash

# Nginx Setup Script for MOA Agricultural Planning System
# Server: 10.10.20.233:8080

set -e

echo "🚀 Setting up Nginx for MOA Agricultural Planning System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root or with sudo"
    exit 1
fi

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    apt update
    apt install -y nginx
fi

# Create nginx config directory
NGINX_CONF_DIR="/etc/nginx/sites-available"
PROJECT_DIR="/home/moapms/moa-planning-system"

# Backup existing configuration if it exists
if [ -f "$NGINX_CONF_DIR/moa-planning-system" ]; then
    print_warning "Backing up existing Nginx configuration..."
    cp "$NGINX_CONF_DIR/moa-planning-system" "$NGINX_CONF_DIR/moa-planning-system.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Copy the Nginx configuration
print_status "Installing Nginx configuration..."
cp "$PROJECT_DIR/nginx/moa-planning-system.conf" "$NGINX_CONF_DIR/"

# Create symbolic link to enable the site
ln -sf "$NGINX_CONF_DIR/moa-planning-system" "/etc/nginx/sites-enabled/"

# Remove default site if it exists
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    print_status "Removing default Nginx site..."
    rm -f "/etc/nginx/sites-enabled/default"
fi

# Test Nginx configuration
print_status "Testing Nginx configuration..."
if nginx -t; then
    print_status "Nginx configuration test passed!"
else
    print_error "Nginx configuration test failed!"
    exit 1
fi

# Restart Nginx
print_status "Restarting Nginx..."
systemctl restart nginx
systemctl enable nginx

# Create log directories
mkdir -p /var/log/nginx

# Set proper permissions
chown -R www-data:www-data /var/log/nginx
chmod -R 755 /var/log/nginx

# Create log rotation for the application logs
cat > /etc/logrotate.d/moa-planning-system << 'EOF'
/var/log/nginx/moa-planning-system-*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF

# Configure firewall if UFW is installed
if command -v ufw &> /dev/null; then
    print_status "Configuring firewall..."
    ufw allow 'Nginx Full'
    ufw allow 8080/tcp
    ufw --force enable
fi

# Create a simple status page
mkdir -p /var/www/html
cat > /var/www/html/nginx-status.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>MOA Agricultural Planning System - Nginx Status</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .status { color: green; font-weight: bold; }
        .info { background: #f4f4f4; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>MOA Agricultural Planning System</h1>
    <div class="info">
        <h2>Server Status: <span class="status">Running</span></h2>
        <p><strong>Server IP:</strong> 10.10.20.233</p>
        <p><strong>Port:</strong> 8080</p>
        <p><strong>Frontend:</strong> <a href="http://10.10.20.233:8080">http://10.10.20.233:8080</a></p>
        <p><strong>API:</strong> <a href="http://10.10.20.233:8080/api">http://10.10.20.233:8080/api</a></p>
        <p><strong>Admin:</strong> <a href="http://10.10.20.233:8080/admin">http://10.10.20.233:8080/admin</a></p>
    </div>
</body>
</html>
EOF

print_status "Nginx setup completed successfully!"
echo ""
echo -e "${GREEN}🎉 Nginx Configuration Summary:${NC}"
echo "📍 Server: http://10.10.20.233:8080"
echo "🔧 Configuration: /etc/nginx/sites-available/moa-planning-system"
echo "📋 Logs: /var/log/nginx/moa-planning-system-*.log"
echo "🔥 Status: http://10.10.20.233:8080/nginx-status.html"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Make sure your Docker containers are running on ports 3000 (frontend) and 8000 (backend)"
echo "- Check logs with: tail -f /var/log/nginx/moa-planning-system-access.log"
echo "- Test configuration with: nginx -t"
echo "- Restart Nginx with: systemctl restart nginx"
