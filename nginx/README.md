# Nginx Configuration for MOA Agricultural Planning System

## Overview
This Nginx configuration provides reverse proxy setup for the MOA Agricultural Planning System running on server `10.10.20.233:8080`.

## Configuration Files

### `moa-planning-system.conf`
Main Nginx configuration file with:
- **Port**: 8080
- **Server**: 10.10.20.233
- **Frontend**: Proxy to localhost:3000
- **Backend API**: Proxy to localhost:8000
- **Admin Panel**: Proxy to localhost:8000/admin/
- **Static Files**: Served from `/home/moapms/moa-planning-system/backend/static/`
- **Media Files**: Served from `/home/moapms/moa-planning-system/backend/media/`

### `nginx-setup.sh`
Automated setup script that:
- Installs Nginx (if not installed)
- Configures the site
- Sets up log rotation
- Configures firewall
- Creates status page

## Quick Setup

### 1. Copy Files to Server
```bash
scp -r nginx/ moapms@10.10.20.233:~/moa-planning-system/
```

### 2. Run Setup Script
```bash
ssh moapms@10.10.20.233
cd ~/moa-planning-system/nginx
sudo chmod +x nginx-setup.sh
sudo ./nginx-setup.sh
```

### 3. Manual Setup (Alternative)
```bash
# Copy configuration
sudo cp moa-planning-system.conf /etc/nginx/sites-available/

# Enable site
sudo ln -sf /etc/nginx/sites-available/moa-planning-system /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## URL Mappings

| Path | Destination | Description |
|------|-------------|-------------|
| `/` | `http://localhost:3000` | Frontend application |
| `/api/` | `http://localhost:8000` | Backend API |
| `/admin/` | `http://localhost:8000/admin/` | Django admin panel |
| `/auth/` | `http://localhost:8000/auth/` | Authentication endpoints |
| `/static/` | File system | Django static files |
| `/media/` | File system | User uploaded media |
| `/health` | Nginx | Health check endpoint |

## Features

### Security Headers
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Referrer-Policy: no-referrer-when-downgrade
- Content-Security-Policy: default-src 'self'

### Performance
- Gzip compression enabled
- Static file caching (1 year)
- Media file caching (30 days)
- Connection timeouts optimized

### CORS Support
- Automatic CORS headers for API endpoints
- Preflight request handling
- Origin-based access control

### Security
- Block access to sensitive files (.py, .db, .log)
- Block hidden files (starting with .)
- Rate limiting ready (can be added)

## Management Commands

### Check Nginx Status
```bash
sudo systemctl status nginx
```

### Test Configuration
```bash
sudo nginx -t
```

### Reload Configuration
```bash
sudo systemctl reload nginx
```

### Restart Nginx
```bash
sudo systemctl restart nginx
```

### View Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/moa-planning-system-access.log

# Error logs
sudo tail -f /var/log/nginx/moa-planning-system-error.log

# Nginx main logs
sudo tail -f /var/log/nginx/error.log
```

### Log Rotation
Logs are automatically rotated daily with:
- 52 days retention
- Compression enabled
- Automatic Nginx reload after rotation

## Troubleshooting

### 502 Bad Gateway
- Check if backend containers are running: `docker ps`
- Verify backend port: `curl http://localhost:8000`
- Check backend logs: `docker logs moa-backend-prod`

### 504 Gateway Timeout
- Increase proxy timeouts in configuration
- Check backend performance
- Monitor server resources

### Static Files Not Loading
- Verify static file paths
- Run `collectstatic`: `docker exec moa-backend-prod python manage.py collectstatic`
- Check file permissions

### CORS Issues
- Verify CORS headers in `/api/` location block
- Check frontend API calls
- Test with curl: `curl -H "Origin: http://10.10.20.233:8080" http://10.10.20.233:8080/api/`

## SSL/HTTPS Setup (Optional)

To enable HTTPS, add SSL configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name 10.10.20.233;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$host$request_uri;
    }
    
    # ... rest of configuration
}
```

## Monitoring

### Health Check
```bash
curl http://10.10.20.233:8080/health
```

### Status Page
Visit `http://10.10.20.233:8080/nginx-status.html` for system status.

### Performance Monitoring
```bash
# Monitor Nginx processes
ps aux | grep nginx

# Monitor connections
sudo netstat -tulpn | grep :8080

# Monitor resource usage
htop
```
