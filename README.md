# Tweak Application

A comprehensive system optimization and remote management application with advanced security features, analytics, and enterprise-level capabilities.

## 🚀 Features

### 🔒 Security Enhancements
- **IP Logging & Geolocation**: Track user locations and IP addresses for all activities
- **Session Management**: Real-time session tracking with admin termination capabilities
- **Audit Log Export**: CSV and PDF export functionality with scheduled exports
- **Webhook Support**: Real-time notifications to Discord/Slack with retry mechanisms
- **Advanced Authentication**: 2FA, email verification, and brute-force protection

### 📊 Admin Dashboard
- **User Management**: Advanced user management with bulk operations
- **Key Usage Statistics**: Comprehensive charts and analytics for key generation and usage
- **User Grouping/Tags**: Custom tag system with colors and bulk assignment
- **Advanced Search & Filter**: Powerful multi-criteria search with saved queries
- **Dark/Light Mode**: Complete theme switching with system preference detection
- **Email Management**: SMTP configuration, email statistics, and verification management
- **Real-time Monitoring**: Monitor online users and system status with live updates

### 💻 Desktop Application
- **System Optimization**: Clean temporary files, optimize performance
- **System Monitoring**: Real-time memory, disk, and network monitoring
- **Remote Management**: Accept remote commands and screen capture requests
- **Email Verification**: Two-factor authentication and email verification support
- **UI Customization**: Complete settings system with themes, colors, and layout options
- **Offline Cache**: Local data caching with automatic sync when online
- **Crash Reporting**: Automatic crash detection and reporting system
- **System Information**: Detailed system specs and status

### 🌐 Remote Features
- **File Transfer**: Enhanced file operations with size limits and comprehensive logging
- **Clipboard Sharing**: Text/HTML/URL sharing with templates and bulk operations
- **Command Preset Library**: Predefined commands with variable substitution
- **Screen View Permission**: User approval system with time-limited permissions
- **Remote Control**: Execute commands on user machines with permission system

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Admin   │    │  Node.js API    │    │ Electron App    │
│   Dashboard     │◄──►│   Backend       │◄──►│   Desktop       │
│   (Port 3000)   │    │  (Port 3001)    │    │   Client        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   MariaDB       │
                       │   Database      │
                       │   + Redis       │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   SMTP Server   │
                       │   + Webhooks    │
                       └─────────────────┘
```

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **MariaDB** (v10.6 or higher)
- **Redis** (v6.0 or higher) - Optional, for caching
- **SMTP email server** (Gmail, Outlook, SendGrid, etc.)
- **npm** or **yarn**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd tweak-application
```

### 2. Database Setup

1. Install MariaDB on your system
2. Create a database for the application:

```sql
CREATE DATABASE tweak_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. Import the database schema:

```bash
mysql -u root -p tweak_app < backend/database/schema.sql
```

### 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tweak_app

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Application Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@tweak.com
SMTP_FROM_NAME=Tweak Application

# Security Configuration
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30m
EMAIL_RATE_LIMIT_WINDOW=15m
EMAIL_RATE_LIMIT_MAX=10
VERIFICATION_CODE_EXPIRY=10m

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create environment file:

```bash
echo "REACT_APP_API_URL=http://localhost:3001/api" > .env.local
echo "REACT_APP_WS_URL=http://localhost:3001" >> .env.local
```

### 5. Desktop App Setup

```bash
cd desktop-app
npm install
```

## 🏃‍♂️ Running the Application

### Development Mode

1. **Start the Backend Server**:
```bash
cd backend
npm run dev
```

2. **Start the Frontend Dashboard**:
```bash
cd frontend
npm start
```

3. **Start the Desktop Application**:
```bash
cd desktop-app
npm run dev
```

### Production Mode

1. **Build the Frontend**:
```bash
cd frontend
npm run build
```

2. **Start the Backend**:
```bash
cd backend
npm start
```

3. **Build the Desktop App**:
```bash
cd desktop-app
npm run build
```

## 📖 Usage

### Admin Dashboard

1. Open your browser and navigate to `http://localhost:3000`
2. Login with admin credentials (default: admin/admin123)
3. Use the enhanced dashboard to:
   - **User Management**: Advanced user search, filtering, and bulk operations
   - **Key Statistics**: View comprehensive analytics and usage trends
   - **Security**: Monitor IP logs, manage sessions, and configure webhooks
   - **Remote Control**: Execute commands with permission system
   - **File Operations**: Transfer files with logging and limits
   - **Theme Settings**: Switch between light/dark modes

### Desktop Application

1. Launch the desktop application
2. Login with your user credentials (you'll need a registration key from an admin)
3. Use the enhanced application to:
   - **System Monitoring**: Real-time performance monitoring
   - **Remote Management**: Accept remote commands and file transfers
   - **Settings**: Customize themes, colors, and layout
   - **Offline Mode**: Continue working offline with automatic sync
   - **Crash Reporting**: Automatic error reporting to admins

## 🔌 API Endpoints

### Authentication & Security
- `POST /api/auth/login` - User login with 2FA support
- `POST /api/auth/register` - User registration with email verification
- `POST /api/auth/verify-code` - Email verification
- `POST /api/auth/complete-2fa` - Complete 2FA authentication
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with verification
- `GET /api/auth/me` - Get current user info

### Security Features
- `GET /api/security/ip-logs` - Get IP logs with geolocation
- `GET /api/security/sessions` - List active sessions
- `DELETE /api/security/sessions/:id` - Terminate session
- `GET /api/security/export/audit-logs` - Export audit logs
- `POST /api/security/schedule-export` - Schedule automated exports

### User Management
- `GET /api/admin/users` - List users with advanced filtering
- `POST /api/advanced-search/users` - Advanced user search
- `GET /api/user-tags` - Manage user tags
- `POST /api/user-tags/:id/assign/:userId` - Assign tags to users

### Statistics & Analytics
- `GET /api/key-statistics/dashboard` - Comprehensive dashboard data
- `GET /api/key-statistics/activation-rate` - Key activation statistics
- `GET /api/key-statistics/location` - Geographic usage statistics
- `GET /api/key-statistics/export` - Export statistics data

### Remote Control
- `POST /api/remote/execute/:userId` - Execute command with permission
- `POST /api/screen-view/request/:userId` - Request screen view permission
- `GET /api/screen-view/permissions` - List permission requests
- `GET /api/command-presets` - Get command preset library

### File Operations
- `POST /api/file-transfer/upload/:userId` - Upload file to user
- `POST /api/file-transfer/download/:userId` - Download file from user
- `GET /api/file-transfer/logs` - Get transfer logs
- `POST /api/clipboard/send/:userId` - Send content to clipboard

### Webhooks
- `GET /api/webhooks` - List configured webhooks
- `POST /api/webhooks` - Create new webhook
- `PUT /api/webhooks/:id` - Update webhook configuration
- `POST /api/webhooks/:id/test` - Test webhook delivery

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts with enhanced security fields
- **user_security_settings**: 2FA and security preferences
- **email_verification_codes**: Email verification system
- **user_sessions**: Active session tracking
- **ip_logs**: IP address and geolocation logging

### Feature Tables
- **user_tags**: Custom user tags and categories
- **user_tag_assignments**: User-tag relationships
- **file_transfer_logs**: File transfer activity logging
- **command_presets**: Predefined command templates
- **screen_view_permissions**: Screen view permission system
- **webhook_configs**: Webhook configuration storage
- **clipboard_sharing_logs**: Clipboard sharing activity
- **crash_reports**: Desktop app crash reporting
- **offline_cache**: Offline data caching

### Audit & Logging
- **activity_logs**: Comprehensive activity logging
- **email_logs**: Email delivery tracking
- **webhook_logs**: Webhook delivery status

## 🔐 Security Features

### Authentication & Authorization
- **JWT Authentication**: Secure token-based authentication
- **2FA Support**: Two-factor authentication with email codes
- **Email Verification**: 8-digit verification codes with expiry
- **Password Security**: bcrypt hashing with salt rounds
- **Account Lockout**: Brute-force protection with lockout periods

### Network Security
- **Rate Limiting**: Protection against brute force attacks
- **IP Logging**: Track and log all user IP addresses
- **Geolocation**: Approximate location tracking for security
- **Session Management**: Real-time session monitoring and termination

### Data Protection
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Configured CORS policies
- **Helmet Security**: Security headers middleware
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Output encoding and validation

## 🚀 Deployment

### Docker Deployment

1. **Create docker-compose.yml**:
```yaml
version: '3.8'
services:
  database:
    image: mariadb:10.6
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: tweak_app
    volumes:
      - db_data:/var/lib/mysql
      - ./backend/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "3306:3306"

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DB_HOST: database
      REDIS_HOST: redis
    depends_on:
      - database
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  db_data:
  redis_data:
```

2. **Deploy with Docker**:
```bash
docker-compose up -d
```

### Production Deployment

For detailed production deployment instructions, see [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

### Cloud Deployment

The application supports deployment on:
- **AWS**: EC2, RDS, Elastic Beanstalk
- **Google Cloud**: Cloud Run, Cloud SQL
- **Azure**: Container Instances, SQL Database
- **DigitalOcean**: Droplets, Managed Databases

## 📊 Monitoring & Analytics

### Built-in Analytics
- **Key Usage Statistics**: Generation, activation, and retention rates
- **User Activity**: Login patterns, geographic distribution
- **System Performance**: Response times, error rates
- **Security Metrics**: Failed logins, suspicious activity

### Monitoring Tools
- **Health Checks**: `/api/health` endpoint for monitoring
- **Log Management**: Structured logging with rotation
- **Performance Metrics**: Real-time system monitoring
- **Alert System**: Webhook-based notifications

## 🔧 Configuration

### Environment Variables

See [Configuration Guide](docs/ENHANCED_FEATURES.md#configuration-guide) for complete environment variable documentation.

### Webhook Configuration

Configure webhooks for real-time notifications:

#### Discord Webhook
```json
{
  "name": "Discord Notifications",
  "url": "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN",
  "events": ["user_login", "user_registration", "security_alert"]
}
```

#### Slack Webhook
```json
{
  "name": "Slack Alerts",
  "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
  "events": ["user_login", "user_registration", "security_alert"]
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Check MariaDB is running
   - Verify database credentials in `.env`
   - Ensure database exists and schema is imported

2. **SMTP Issues**:
   - Verify SMTP credentials
   - Check email provider settings
   - Review rate limiting configuration

3. **Frontend Not Loading**:
   - Check if backend is running on port 3001
   - Verify environment variables
   - Check browser console for errors

4. **Desktop App Not Connecting**:
   - Ensure backend server is running
   - Check firewall settings
   - Verify network connectivity

### Debug Mode

Enable debug mode for detailed logging:
```env
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=tweak-app:*
```

### Health Checks

Monitor application health:
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status

## 📚 Documentation

- **[Enhanced Features](docs/ENHANCED_FEATURES.md)**: Complete feature documentation
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**: Production deployment instructions
- **[API Documentation](docs/API_DOCUMENTATION.md)**: Comprehensive API reference
- **[SMTP Integration](docs/SMTP_INTEGRATION.md)**: Email system setup guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [docs](docs/) folder for detailed guides
- **Issues**: Create an issue in the repository for bug reports
- **Discussions**: Use GitHub Discussions for questions and feature requests

## 🎯 Roadmap

### Upcoming Features
- [ ] Mobile application (React Native)
- [ ] Advanced reporting and dashboards
- [ ] Multi-tenant support
- [ ] API rate limiting per user
- [ ] Advanced security scanning
- [ ] Integration with external monitoring tools

### Version History
- **v2.0.0**: Enhanced security, analytics, and remote features
- **v1.0.0**: Initial release with basic functionality

---

**Built with ❤️ using Node.js, React, Electron, and MariaDB**