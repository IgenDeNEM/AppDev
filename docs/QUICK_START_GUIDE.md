# Tweak Application - Quick Start Guide

Get up and running with the Tweak Application in minutes!

## 🚀 Quick Installation (5 Minutes)

### Prerequisites Check
```bash
# Check if you have Node.js (v18+)
node --version

# Check if you have MariaDB
mysql --version

# If not installed, see full installation guide
```

### 1. Clone and Setup
```bash
git clone https://github.com/your-username/tweak-application.git
cd tweak-application
```

### 2. Install Dependencies
```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# Desktop App
cd desktop-app && npm install && cd ..
```

### 3. Database Setup
```bash
# Create database (replace 'password' with your MariaDB root password)
mysql -u root -p -e "CREATE DATABASE tweak_app; CREATE USER 'tweak_user'@'localhost' IDENTIFIED BY 'password'; GRANT ALL PRIVILEGES ON tweak_app.* TO 'tweak_user'@'localhost'; FLUSH PRIVILEGES;"

# Import schema
mysql -u tweak_user -p tweak_app < backend/database/schema.sql
```

### 4. Environment Configuration
```bash
# Copy and edit environment file
cd backend
cp .env.example .env

# Edit .env file with your settings
nano .env  # or use your preferred editor
```

**Minimum required .env settings:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tweak_app
DB_USER=tweak_user
DB_PASSWORD=password

JWT_SECRET=your_jwt_secret_key_here
PORT=5000
FRONTEND_URL=http://localhost:3000

# SMTP (optional for email verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 5. Start the Application
```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend (Admin Panel)
cd frontend
npm start

# Terminal 3: Start Desktop App
cd desktop-app
npm run dev
```

## 🎯 First Steps

### 1. Access the Admin Panel
- Open your browser to `http://localhost:3000`
- Create your first admin account
- Configure SMTP settings (optional)

### 2. Run the Desktop App
- The desktop app should open automatically
- Login with your admin credentials
- Explore the Home tab with pre-configured tweaks

### 3. Test Basic Functionality
- Try a simple tweak like "Clean Recycle Bin"
- Install a package from the Package Store
- Check the admin panel for activity logs

## 🔧 Common Quick Fixes

### Port Already in Use
```bash
# Kill process on port 5000
npx kill-port 5000

# Kill process on port 3000
npx kill-port 3000
```

### Database Connection Issues
```bash
# Check if MariaDB is running
sudo systemctl status mariadb  # Linux
net start mariadb              # Windows

# Test connection
mysql -u tweak_user -p tweak_app -e "SELECT 1;"
```

### Permission Issues (Linux)
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

## 📱 Quick Feature Tour

### Home Tab
- **Quick Actions**: Performance Boost, System Cleanup, DNS Flush
- **Tweak Categories**: Privacy, Gaming, Files, Updates, Performance, System
- **Theme Toggle**: Switch between light and dark modes

### Remove Apps Tab
- **Safe Mode**: Prevents removal of system applications
- **Multi-select**: Select multiple apps for batch removal
- **Search**: Find specific applications quickly

### Package Store Tab
- **Categories**: Browsers, Gaming, Communication, Developer Tools, Utilities
- **Installation**: One-click installation via Chocolatey/Winget
- **Verification**: Email verification for protected packages

### Admin Panel
- **User Management**: Create users and assign roles
- **Package Management**: Add/edit packages and categories
- **Activity Logs**: Monitor all system activities
- **SMTP Settings**: Configure email verification

## 🆘 Need Help?

### Quick Troubleshooting
1. **Check logs**: Look in `backend/logs/` for error messages
2. **Verify database**: Ensure MariaDB is running and accessible
3. **Check ports**: Make sure ports 3000 and 5000 are available
4. **Environment**: Verify your `.env` file has correct settings

### Getting Support
- **Documentation**: Check `/docs` folder for detailed guides
- **GitHub Issues**: Report bugs and request features
- **Health Check**: Visit `http://localhost:5000/api/health`

## 🎉 You're Ready!

Your Tweak Application is now running with:
- ✅ Backend server on port 5000
- ✅ Admin panel on port 3000
- ✅ Desktop application ready to use
- ✅ Database configured and ready
- ✅ Basic security features enabled

**Next Steps:**
1. Configure SMTP for email verification
2. Set up user roles and permissions
3. Add custom packages to the store
4. Customize tweaks for your needs

For detailed configuration and advanced features, see the full documentation in the `/docs` folder.

---

**Happy Tweaking! 🚀**