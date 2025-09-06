# Deployment Guide

This guide provides step-by-step instructions for deploying the enhanced Tweak application in various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Production Deployment](#production-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Monitoring Setup](#monitoring-setup)
6. [Backup and Recovery](#backup-and-recovery)
7. [Security Hardening](#security-hardening)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Requirements**:
- CPU: 2 cores, 2.4GHz
- RAM: 4GB
- Storage: 20GB SSD
- OS: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+

**Recommended Requirements**:
- CPU: 4 cores, 3.0GHz
- RAM: 8GB
- Storage: 50GB SSD
- OS: Ubuntu 22.04 LTS

### Software Dependencies

**Backend**:
- Node.js 18.x or higher
- MariaDB 10.6+ or MySQL 8.0+
- Redis 6.0+ (optional, for caching)

**Frontend**:
- Node.js 18.x or higher
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)

**Desktop Application**:
- Windows 10+ / macOS 10.15+ / Linux (Ubuntu 20.04+)
- Electron 22+

### Network Requirements

- Port 3001: Backend API server
- Port 3000: Frontend development server
- Port 3306: MariaDB/MySQL database
- Port 6379: Redis (if used)
- HTTPS: Port 443 (production)
- HTTP: Port 80 (redirect to HTTPS)

## Production Deployment

### 1. Server Setup

#### Ubuntu/Debian Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MariaDB
sudo apt install mariadb-server mariadb-client -y
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Install Nginx
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2 for process management
sudo npm install -g pm2

# Install Redis (optional)
sudo apt install redis-server -y
sudo systemctl start redis
sudo systemctl enable redis
```

#### CentOS/RHEL Setup
```bash
# Update system
sudo yum update -y

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install MariaDB
sudo yum install mariadb-server mariadb -y
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Install Nginx
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2
sudo npm install -g pm2

# Install Redis (optional)
sudo yum install redis -y
sudo systemctl start redis
sudo systemctl enable redis
```

### 2. Database Setup

#### MariaDB Configuration
```bash
# Secure MariaDB installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE tweak_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tweak_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON tweak_app.* TO 'tweak_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Database Schema Setup
```bash
# Navigate to project directory
cd /opt/tweak-app

# Run database schema
mysql -u tweak_user -p tweak_app < backend/database/schema.sql

# Create initial admin user
mysql -u tweak_user -p tweak_app -e "
INSERT INTO users (username, email, password, role, is_active, created_at) 
VALUES ('admin', 'admin@yourdomain.com', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'superadmin', 1, NOW());
"
```

### 3. Application Deployment

#### Backend Deployment
```bash
# Create application directory
sudo mkdir -p /opt/tweak-app
sudo chown $USER:$USER /opt/tweak-app

# Clone or copy application files
cd /opt/tweak-app

# Install backend dependencies
cd backend
npm install --production

# Create environment file
cp .env.example .env
nano .env
```

**Production .env Configuration**:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tweak_app
DB_USER=tweak_user
DB_PASSWORD=secure_password_here

# JWT
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=24h

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Tweak Application

# Security
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30m
EMAIL_RATE_LIMIT_WINDOW=15m
EMAIL_RATE_LIMIT_MAX=10
VERIFICATION_CODE_EXPIRES_IN=10m

# Application
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
LOG_LEVEL=info
```

#### Frontend Deployment
```bash
# Install frontend dependencies
cd ../frontend
npm install

# Build for production
npm run build

# Create production environment file
echo "REACT_APP_API_URL=https://yourdomain.com/api" > .env.production
echo "REACT_APP_WS_URL=wss://yourdomain.com" >> .env.production

# Rebuild with production environment
npm run build
```

### 4. Nginx Configuration

#### Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/tweak-app
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
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
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        root /opt/tweak-app/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
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
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # WebSocket support
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

    # File upload size limit
    client_max_body_size 100M;
}
```

#### Enable Site and Configure Rate Limiting
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tweak-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Add rate limiting to nginx.conf
sudo nano /etc/nginx/nginx.conf
```

Add to http block:
```nginx
http {
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
    
    # ... rest of configuration
}
```

```bash
# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL Certificate Setup

#### Using Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 6. Process Management with PM2

#### Create PM2 Configuration
```bash
nano /opt/tweak-app/ecosystem.config.js
```

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
    error_file: '/var/log/tweak-app/backend-error.log',
    out_file: '/var/log/tweak-app/backend-out.log',
    log_file: '/var/log/tweak-app/backend-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

#### Start Application
```bash
# Create log directory
sudo mkdir -p /var/log/tweak-app
sudo chown $USER:$USER /var/log/tweak-app

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## Docker Deployment

### 1. Docker Compose Setup

#### Create docker-compose.yml
```yaml
version: '3.8'

services:
  database:
    image: mariadb:10.6
    container_name: tweak-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_password_here
      MYSQL_DATABASE: tweak_app
      MYSQL_USER: tweak_user
      MYSQL_PASSWORD: user_password_here
    volumes:
      - db_data:/var/lib/mysql
      - ./backend/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "3306:3306"
    networks:
      - tweak-network

  redis:
    image: redis:6-alpine
    container_name: tweak-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - tweak-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tweak-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DB_HOST=database
      - DB_PORT=3306
      - DB_NAME=tweak_app
      - DB_USER=tweak_user
      - DB_PASSWORD=user_password_here
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    ports:
      - "3001:3001"
    depends_on:
      - database
      - redis
    volumes:
      - ./logs:/app/logs
    networks:
      - tweak-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: tweak-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - tweak-network

  nginx:
    image: nginx:alpine
    container_name: tweak-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - tweak-network

volumes:
  db_data:
  redis_data:

networks:
  tweak-network:
    driver: bridge
```

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "server.js"]
```

#### Frontend Dockerfile
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale backend service
docker-compose up -d --scale backend=3

# Update services
docker-compose pull
docker-compose up -d
```

## Cloud Deployment

### AWS Deployment

#### EC2 Setup
```bash
# Launch EC2 instance (t3.medium or larger)
# Install Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### RDS Database Setup
```bash
# Create RDS MariaDB instance
aws rds create-db-instance \
    --db-instance-identifier tweak-db \
    --db-instance-class db.t3.micro \
    --engine mariadb \
    --master-username admin \
    --master-user-password your-password \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-xxxxxxxxx
```

#### Application Load Balancer
```bash
# Create target group
aws elbv2 create-target-group \
    --name tweak-targets \
    --protocol HTTP \
    --port 3000 \
    --vpc-id vpc-xxxxxxxxx \
    --health-check-path /api/health

# Create load balancer
aws elbv2 create-load-balancer \
    --name tweak-alb \
    --subnets subnet-xxxxxxxxx subnet-yyyyyyyyy \
    --security-groups sg-xxxxxxxxx
```

### Google Cloud Platform

#### Cloud Run Deployment
```bash
# Build and push container
gcloud builds submit --tag gcr.io/PROJECT_ID/tweak-app

# Deploy to Cloud Run
gcloud run deploy tweak-app \
    --image gcr.io/PROJECT_ID/tweak-app \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated
```

#### Cloud SQL Setup
```bash
# Create Cloud SQL instance
gcloud sql instances create tweak-db \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region=us-central1
```

### Azure Deployment

#### Container Instances
```bash
# Create resource group
az group create --name tweak-rg --location eastus

# Deploy container
az container create \
    --resource-group tweak-rg \
    --name tweak-app \
    --image your-registry/tweak-app:latest \
    --dns-name-label tweak-app \
    --ports 3001
```

## Monitoring Setup

### 1. Application Monitoring

#### PM2 Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# View monitoring dashboard
pm2 monit
```

#### Log Management
```bash
# Install logrotate
sudo apt install logrotate -y

# Create logrotate configuration
sudo nano /etc/logrotate.d/tweak-app
```

```bash
/var/log/tweak-app/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. System Monitoring

#### Install Monitoring Tools
```bash
# Install htop, iotop, nethogs
sudo apt install htop iotop nethogs -y

# Install Prometheus Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo useradd --no-create-home --shell /bin/false node_exporter
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter
```

#### Create systemd service
```bash
sudo nano /etc/systemd/system/node_exporter.service
```

```ini
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

### 3. Database Monitoring

#### MariaDB Monitoring
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';

-- Monitor connections
SHOW STATUS LIKE 'Connections';
SHOW STATUS LIKE 'Max_used_connections';

-- Monitor query cache
SHOW STATUS LIKE 'Qcache%';
```

## Backup and Recovery

### 1. Database Backup

#### Automated Backup Script
```bash
nano /opt/tweak-app/scripts/backup-db.sh
```

```bash
#!/bin/bash

# Configuration
DB_NAME="tweak_app"
DB_USER="tweak_user"
DB_PASS="your_password"
BACKUP_DIR="/opt/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/tweak_app_$DATE.sql.gz

# Remove old backups
find $BACKUP_DIR -name "tweak_app_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log backup
echo "$(date): Database backup completed - tweak_app_$DATE.sql.gz" >> /var/log/tweak-app/backup.log
```

```bash
chmod +x /opt/tweak-app/scripts/backup-db.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/tweak-app/scripts/backup-db.sh
```

### 2. Application Backup

#### Full System Backup
```bash
nano /opt/tweak-app/scripts/backup-app.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/application"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/tweak-app"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create application backup
tar -czf $BACKUP_DIR/tweak_app_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='.git' \
    $APP_DIR

# Remove old backups (keep 7 days)
find $BACKUP_DIR -name "tweak_app_*.tar.gz" -mtime +7 -delete

echo "$(date): Application backup completed - tweak_app_$DATE.tar.gz" >> /var/log/tweak-app/backup.log
```

### 3. Recovery Procedures

#### Database Recovery
```bash
# Stop application
pm2 stop all

# Restore database
gunzip -c /opt/backups/database/tweak_app_YYYYMMDD_HHMMSS.sql.gz | mysql -u tweak_user -p tweak_app

# Start application
pm2 start all
```

#### Application Recovery
```bash
# Stop application
pm2 stop all

# Restore application
tar -xzf /opt/backups/application/tweak_app_YYYYMMDD_HHMMSS.tar.gz -C /

# Install dependencies
cd /opt/tweak-app/backend
npm install --production

# Start application
pm2 start ecosystem.config.js
```

## Security Hardening

### 1. System Security

#### Firewall Configuration
```bash
# Install UFW
sudo apt install ufw -y

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### Fail2Ban Setup
```bash
# Install fail2ban
sudo apt install fail2ban -y

# Configure fail2ban
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
```

```bash
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 2. Application Security

#### Environment Security
```bash
# Secure environment file
sudo chmod 600 /opt/tweak-app/backend/.env
sudo chown root:root /opt/tweak-app/backend/.env
```

#### Database Security
```sql
-- Remove test databases
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- Create application-specific user with limited privileges
CREATE USER 'tweak_app'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON tweak_app.* TO 'tweak_app'@'localhost';
FLUSH PRIVILEGES;
```

### 3. SSL/TLS Security

#### SSL Configuration
```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
sudo systemctl status mariadb

# Check database logs
sudo tail -f /var/log/mysql/error.log

# Test connection
mysql -u tweak_user -p -h localhost tweak_app
```

#### 2. Application Not Starting
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs tweak-backend

# Check system resources
htop
df -h
free -h
```

#### 3. Nginx Issues
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Reload Nginx
sudo systemctl reload nginx
```

#### 4. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Analyze table performance
ANALYZE TABLE users, sessions, logs;

-- Optimize tables
OPTIMIZE TABLE users, sessions, logs;

-- Check slow queries
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

#### 2. Application Optimization
```bash
# Monitor memory usage
pm2 monit

# Restart application if memory usage is high
pm2 restart tweak-backend

# Scale application
pm2 scale tweak-backend 3
```

#### 3. Nginx Optimization
```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Enable caching
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Health Checks

#### Application Health Check
```bash
# Create health check script
nano /opt/tweak-app/scripts/health-check.sh
```

```bash
#!/bin/bash

# Check if application is responding
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "Application is healthy"
    exit 0
else
    echo "Application is not responding"
    exit 1
fi
```

#### Database Health Check
```bash
# Check database connectivity
mysql -u tweak_user -p -e "SELECT 1" tweak_app > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Database is healthy"
else
    echo "Database connection failed"
fi
```

This deployment guide provides comprehensive instructions for deploying the Tweak application in various environments. Follow the steps carefully and adapt them to your specific requirements and infrastructure.