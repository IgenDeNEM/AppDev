# Tweak Application - Installation Guide

This guide provides step-by-step instructions for installing and running the Tweak Application on Windows and Linux systems.

## 📋 Prerequisites

### System Requirements
- **Operating System**: Windows 10/11 or Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 2GB free space
- **Network**: Internet connection for package downloads and email verification

### Software Requirements
- **Node.js**: v18.0.0 or higher
- **MariaDB**: v10.6 or higher
- **Git**: Latest version
- **Chocolatey** (Windows) or **Package Manager** (Linux)
- **SMTP Server**: For email verification (Gmail, Outlook, or custom SMTP)

## 🪟 Windows Installation

### Step 1: Install Node.js
1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

### Step 2: Install MariaDB
1. Download MariaDB from [mariadb.org](https://mariadb.org/download/)
2. Run the installer and set a root password
3. Start MariaDB service:
   ```cmd
   net start mariadb
   ```

### Step 3: Install Chocolatey (Optional but Recommended)
1. Open PowerShell as Administrator
2. Run the installation command:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```
3. Verify installation:
   ```cmd
   choco --version
   ```

### Step 4: Clone the Repository
1. Open Command Prompt or PowerShell
2. Navigate to your desired directory
3. Clone the repository:
   ```cmd
   git clone https://github.com/your-username/tweak-application.git
   cd tweak-application
   ```

### Step 5: Install Dependencies
1. Install backend dependencies:
   ```cmd
   cd backend
   npm install
   ```

2. Install frontend dependencies:
   ```cmd
   cd ../frontend
   npm install
   ```

3. Install desktop app dependencies:
   ```cmd
   cd ../desktop-app
   npm install
   ```

### Step 6: Database Setup
1. Open MariaDB command line:
   ```cmd
   mysql -u root -p
   ```

2. Create database and user:
   ```sql
   CREATE DATABASE tweak_app;
   CREATE USER 'tweak_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON tweak_app.* TO 'tweak_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. Import database schema:
   ```cmd
   mysql -u tweak_user -p tweak_app < backend/database/schema.sql
   ```

### Step 7: Environment Configuration
1. Copy environment template:
   ```cmd
   cd backend
   copy .env.example .env
   ```

2. Edit `.env` file with your configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=tweak_app
   DB_USER=tweak_user
   DB_PASSWORD=your_password

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=24h

   # Server Configuration
   PORT=5000
   FRONTEND_URL=http://localhost:3000

   # SMTP Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   SMTP_FROM_EMAIL=your_email@gmail.com
   SMTP_FROM_NAME=Tweak Application

   # Security Configuration
   MAX_FAILED_LOGIN_ATTEMPTS=5
   ACCOUNT_LOCKOUT_DURATION=15
   EMAIL_RATE_LIMIT_WINDOW=15
   EMAIL_RATE_LIMIT_MAX=3
   VERIFICATION_CODE_EXPIRY=10
   ```

### Step 8: Build Desktop Application
1. Build the Electron app:
   ```cmd
   cd desktop-app
   npm run build
   ```

## 🐧 Linux Installation

### Step 1: Update System Packages
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y

# Fedora
sudo dnf update -y
```

### Step 2: Install Node.js
```bash
# Using NodeSource repository (recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or using package manager
# Ubuntu/Debian
sudo apt install nodejs npm

# CentOS/RHEL
sudo yum install nodejs npm

# Fedora
sudo dnf install nodejs npm
```

### Step 3: Install MariaDB
```bash
# Ubuntu/Debian
sudo apt install mariadb-server mariadb-client

# CentOS/RHEL
sudo yum install mariadb-server mariadb

# Fedora
sudo dnf install mariadb-server mariadb

# Start and enable MariaDB
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

### Step 4: Install Git and Other Dependencies
```bash
# Ubuntu/Debian
sudo apt install git build-essential

# CentOS/RHEL
sudo yum install git gcc gcc-c++ make

# Fedora
sudo dnf install git gcc gcc-c++ make
```

### Step 5: Clone and Setup Repository
```bash
git clone https://github.com/your-username/tweak-application.git
cd tweak-application
```

### Step 6: Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Desktop App
cd ../desktop-app
npm install
```

### Step 7: Database Setup
```bash
# Secure MariaDB installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE tweak_app;
CREATE USER 'tweak_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON tweak_app.* TO 'tweak_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Import schema
mysql -u tweak_user -p tweak_app < backend/database/schema.sql
```

### Step 8: Environment Configuration
```bash
cd backend
cp .env.example .env
nano .env  # Edit with your configuration
```

### Step 9: Build Desktop Application
```bash
cd desktop-app
npm run build
```

## 🚀 Running the Application

### Development Mode

#### 1. Start Backend Server
```bash
cd backend
npm run dev
```
The backend will start on `http://localhost:5000`

#### 2. Start Frontend (Admin Panel)
```bash
cd frontend
npm start
```
The admin panel will start on `http://localhost:3000`

#### 3. Start Desktop Application
```bash
cd desktop-app
npm run dev
```

### Production Mode

#### 1. Build Frontend
```bash
cd frontend
npm run build
```

#### 2. Start Backend in Production
```bash
cd backend
npm start
```

#### 3. Run Desktop Application
```bash
cd desktop-app
npm run start
```

## 🔧 Configuration

### SMTP Setup (Gmail Example)
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the app password in your `.env` file

### Windows Service Installation (Optional)
```cmd
# Install as Windows service
npm install -g node-windows
cd backend
node install-service.js
```

### Linux Service Installation (Optional)
```bash
# Create systemd service
sudo nano /etc/systemd/system/tweak-app.service
```

```ini
[Unit]
Description=Tweak Application Backend
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/tweak-application/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable tweak-app
sudo systemctl start tweak-app
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Linux

# Kill process
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # Linux
```

#### Database Connection Issues
1. Check MariaDB service status:
   ```bash
   # Windows
   net start mariadb
   
   # Linux
   sudo systemctl status mariadb
   ```

2. Verify database credentials in `.env` file
3. Check firewall settings

#### Permission Issues (Linux)
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

#### Node.js Version Issues
```bash
# Install Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install and use Node.js 18
nvm install 18
nvm use 18
```

### Log Files
- **Backend logs**: `backend/logs/`
- **Desktop app logs**: `desktop-app/logs/`
- **System logs**: Check system event viewer (Windows) or journalctl (Linux)

## 🔒 Security Considerations

### Production Deployment
1. **Use HTTPS**: Configure SSL certificates
2. **Firewall**: Restrict access to necessary ports only
3. **Database Security**: Use strong passwords and limit database access
4. **Environment Variables**: Never commit `.env` files to version control
5. **Regular Updates**: Keep all dependencies updated

### Backup Strategy
```bash
# Database backup
mysqldump -u tweak_user -p tweak_app > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf tweak_app_backup_$(date +%Y%m%d).tar.gz /path/to/tweak-application
```

## 📞 Support

### Getting Help
1. **Documentation**: Check the `/docs` folder for detailed guides
2. **Issues**: Report bugs on GitHub Issues
3. **Logs**: Check application and system logs for error details
4. **Community**: Join our Discord server for community support

### Health Checks
```bash
# Backend health
curl http://localhost:5000/api/health

# Database connection
mysql -u tweak_user -p -e "SELECT 1;"
```

---

## 🎉 You're Ready!

After completing the installation, you can:
1. Access the admin panel at `http://localhost:3000`
2. Run the desktop application for system optimization
3. Configure user roles and permissions
4. Set up email verification for enhanced security

For detailed feature documentation, see the other guides in the `/docs` folder.