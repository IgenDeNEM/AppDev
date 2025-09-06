# Deployment Guide

This guide covers deploying the Tweak Application to production environments.

## Production Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Node.js       │    │   MariaDB       │
│   (Port 80/443) │◄──►│   Backend       │◄──►│   Database      │
│   Load Balancer │    │   (Port 3001)   │    │   (Port 3306)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   React App     │
                       │   (Static Files)│
                       └─────────────────┘
```

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)
- Basic knowledge of Linux administration

## Server Setup

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install MariaDB

```bash
sudo apt install mariadb-server mariadb-client -y

# Secure installation
sudo mysql_secure_installation

# Start and enable MariaDB
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

### 4. Install Nginx

```bash
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## Database Setup

### 1. Create Database and User

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE tweak_app;
CREATE USER 'tweak_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON tweak_app.* TO 'tweak_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Import Schema

```bash
mysql -u tweak_user -p tweak_app < backend/database/schema.sql
```

## Application Deployment

### 1. Clone Repository

```bash
cd /opt
sudo git clone <your-repository-url> tweak-app
sudo chown -R $USER:$USER tweak-app
cd tweak-app
```

### 2. Backend Setup

```bash
cd backend
npm install --production
cp .env.example .env
```

Edit `.env` for production:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=tweak_user
DB_PASSWORD=strong_password_here
DB_NAME=tweak_app
JWT_SECRET=very_long_and_random_jwt_secret_key_for_production
JWT_EXPIRES_IN=24h
PORT=3001
NODE_ENV=production
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure_admin_password
```

### 3. Frontend Build

```bash
cd ../frontend
npm install
npm run build
```

### 4. Desktop App Build

```bash
cd ../desktop-app
npm install
npm run build
```

## PM2 Configuration

### 1. Create PM2 Ecosystem File

Create `ecosystem.config.js` in the project root:

```javascript
module.exports = {
  apps: [{
    name: 'tweak-backend',
    script: './backend/server.js',
    cwd: '/opt/tweak-app',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/tweak-app/error.log',
    out_file: '/var/log/tweak-app/out.log',
    log_file: '/var/log/tweak-app/combined.log',
    time: true
  }]
};
```

### 2. Create Log Directory

```bash
sudo mkdir -p /var/log/tweak-app
sudo chown -R $USER:$USER /var/log/tweak-app
```

### 3. Start Application

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Nginx Configuration

### 1. Create Nginx Configuration

Create `/etc/nginx/sites-available/tweak-app`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend (React App)
    location / {
        root /opt/tweak-app/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/tweak-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

### 1. Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Obtain Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. Auto-renewal

```bash
sudo crontab -e
```

Add this line:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

## Firewall Configuration

### 1. Configure UFW

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3306/tcp
sudo ufw enable
```

## Monitoring and Logging

### 1. PM2 Monitoring

```bash
pm2 monit
pm2 logs
```

### 2. System Monitoring

```bash
# Install htop for system monitoring
sudo apt install htop -y

# Monitor system resources
htop
```

### 3. Log Rotation

Create `/etc/logrotate.d/tweak-app`:

```
/var/log/tweak-app/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Backup Strategy

### 1. Database Backup

Create backup script `/opt/tweak-app/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="tweak_app"
DB_USER="tweak_user"
DB_PASS="strong_password_here"

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/tweak_app_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "tweak_app_*.sql" -mtime +7 -delete
```

Make it executable:
```bash
chmod +x /opt/tweak-app/backup.sh
```

### 2. Schedule Backups

```bash
crontab -e
```

Add this line for daily backups at 2 AM:
```
0 2 * * * /opt/tweak-app/backup.sh
```

## Security Hardening

### 1. Database Security

```sql
-- Remove test databases
DROP DATABASE IF EXISTS test;

-- Remove anonymous users
DELETE FROM mysql.user WHERE User='';

-- Disable remote root login
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

FLUSH PRIVILEGES;
```

### 2. System Security

```bash
# Disable root SSH login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Performance Optimization

### 1. MariaDB Optimization

Edit `/etc/mysql/mariadb.conf.d/50-server.cnf`:

```ini
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
query_cache_size = 64M
query_cache_type = 1
max_connections = 200
```

### 2. Node.js Optimization

```bash
# Increase file descriptor limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

## Maintenance

### 1. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
cd /opt/tweak-app/backend && npm update
cd /opt/tweak-app/frontend && npm update
cd /opt/tweak-app/desktop-app && npm update

# Restart application
pm2 restart all
```

### 2. Health Checks

Create health check script `/opt/tweak-app/health-check.sh`:

```bash
#!/bin/bash
# Check if backend is responding
curl -f http://localhost:3001/api/health || exit 1

# Check if database is accessible
mysql -u tweak_user -p$DB_PASS -e "SELECT 1" tweak_app || exit 1

echo "Health check passed"
```

## Troubleshooting

### Common Issues

1. **Application won't start**:
   - Check PM2 logs: `pm2 logs`
   - Verify environment variables
   - Check database connection

2. **Nginx 502 errors**:
   - Check if backend is running: `pm2 status`
   - Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

3. **Database connection issues**:
   - Verify MariaDB is running: `sudo systemctl status mariadb`
   - Check database credentials
   - Verify database exists

### Log Locations

- Application logs: `/var/log/tweak-app/`
- Nginx logs: `/var/log/nginx/`
- MariaDB logs: `/var/log/mysql/`
- System logs: `/var/log/syslog`

## Scaling

### Horizontal Scaling

1. **Load Balancer**: Use multiple backend instances behind a load balancer
2. **Database Replication**: Set up MariaDB master-slave replication
3. **CDN**: Use a CDN for static assets
4. **Caching**: Implement Redis for session storage and caching

### Vertical Scaling

1. **Increase Server Resources**: More CPU, RAM, and storage
2. **Database Optimization**: Tune MariaDB configuration
3. **Application Optimization**: Profile and optimize Node.js code

This deployment guide provides a solid foundation for running the Tweak Application in production. Adjust configurations based on your specific requirements and traffic patterns.