# Enhanced Features Documentation

This document provides comprehensive documentation for all the enhanced features added to the Tweak application.

## Table of Contents

1. [Security Enhancements](#security-enhancements)
2. [Admin Dashboard Enhancements](#admin-dashboard-enhancements)
3. [Desktop Application Enhancements](#desktop-application-enhancements)
4. [Remote Features Enhancements](#remote-features-enhancements)
5. [API Reference](#api-reference)
6. [Configuration Guide](#configuration-guide)

## Security Enhancements

### IP Logging & Geolocation

**Purpose**: Track and log IP addresses and approximate locations for all user activities.

**Features**:
- Automatic IP address capture for login, registration, and verification actions
- Geolocation data retrieval (country, region, city, coordinates)
- IP history tracking per user
- Admin panel display of user location history
- Privacy-compliant data collection

**Database Tables**:
- `ip_logs`: Stores IP addresses, geolocation data, and action context
- `user_sessions`: Links IP data to user sessions

**API Endpoints**:
- `GET /api/security/ip-logs` - Retrieve IP logs with filtering
- `GET /api/security/user/:userId/ip-history` - Get user's IP history
- `GET /api/security/geolocation/:ip` - Get geolocation for specific IP

### Session Management

**Purpose**: Track and manage active user sessions with admin control capabilities.

**Features**:
- Real-time session tracking
- Session termination by admins
- Session expiry management
- Multiple device session support
- Session activity monitoring

**Database Tables**:
- `user_sessions`: Active session tracking
- `session_logs`: Historical session data

**API Endpoints**:
- `GET /api/security/sessions` - List active sessions
- `DELETE /api/security/sessions/:sessionId` - Terminate specific session
- `GET /api/security/user/:userId/sessions` - Get user's session history

### Audit Log Export

**Purpose**: Export audit logs in various formats for compliance and backup purposes.

**Features**:
- CSV and PDF export formats
- Filtered export by date range, user, action type
- Automated scheduled exports
- Comprehensive audit trail
- Compliance-ready reports

**API Endpoints**:
- `GET /api/security/export/audit-logs` - Export audit logs
- `POST /api/security/schedule-export` - Schedule automated exports

### Webhook Support

**Purpose**: Send real-time notifications to external services like Discord or Slack.

**Features**:
- Configurable webhook endpoints
- Event-based notifications
- Retry mechanism for failed deliveries
- Webhook authentication and security
- Event filtering and customization

**Database Tables**:
- `webhook_configs`: Webhook configuration storage
- `webhook_logs`: Delivery status and retry tracking

**API Endpoints**:
- `GET /api/webhooks` - List configured webhooks
- `POST /api/webhooks` - Create new webhook
- `PUT /api/webhooks/:id` - Update webhook configuration
- `DELETE /api/webhooks/:id` - Remove webhook

## Admin Dashboard Enhancements

### Key Usage Statistics

**Purpose**: Display comprehensive charts and statistics about key generation and usage.

**Features**:
- Daily/weekly/monthly key generation charts
- Key activation rate tracking
- Usage trends and predictions
- Geographic distribution of users
- Device type analytics
- Retention rate analysis

**Components**:
- `KeyStatistics.js` - Main statistics dashboard
- Interactive charts using Recharts
- Export functionality for reports
- Real-time data updates

**API Endpoints**:
- `GET /api/key-statistics/dashboard` - Comprehensive dashboard data
- `GET /api/key-statistics/overview` - Key usage overview
- `GET /api/key-statistics/activation-rate` - Activation statistics
- `GET /api/key-statistics/export` - Export statistics data

### User Grouping / Tags

**Purpose**: Allow admins to assign tags or categories to users for better organization.

**Features**:
- Custom tag creation with colors
- Bulk tag assignment
- Tag-based user filtering
- Tag usage statistics
- Hierarchical tag organization

**Database Tables**:
- `user_tags`: Tag definitions
- `user_tag_assignments`: User-tag relationships

**API Endpoints**:
- `GET /api/user-tags` - List all tags
- `POST /api/user-tags` - Create new tag
- `POST /api/user-tags/:id/assign/:userId` - Assign tag to user
- `DELETE /api/user-tags/:id/assign/:userId` - Remove tag from user

### Advanced Search & Filter

**Purpose**: Provide powerful search and filtering capabilities for user management.

**Features**:
- Multi-criteria search (role, status, date ranges, tags, location)
- Real-time search suggestions
- Saved search queries
- Bulk operations on search results
- Export search results

**Components**:
- `AdvancedUserSearch.js` - Advanced search interface
- Filter panels with date pickers
- Autocomplete search suggestions
- Results table with sorting and pagination

**API Endpoints**:
- `POST /api/advanced-search/users` - Advanced user search
- `GET /api/advanced-search/suggestions` - Search suggestions
- `GET /api/advanced-search/filter-options` - Available filter options
- `POST /api/advanced-search/export` - Export search results

### Dark/Light Mode

**Purpose**: Provide theme switching capability for better user experience.

**Features**:
- Light, dark, and auto (system) themes
- Persistent theme preferences
- System theme detection
- Smooth theme transitions
- Custom color schemes

**Components**:
- `ThemeContext.js` - Theme management context
- `ThemeToggle.js` - Theme switching components
- Material-UI theme integration

## Desktop Application Enhancements

### Offline Cache

**Purpose**: Allow tweak features to function offline with data synchronization.

**Features**:
- Local data caching
- Offline operation support
- Automatic sync when online
- Conflict resolution
- Cache management and cleanup

**Database Tables**:
- `offline_cache`: Local cache storage

**API Endpoints**:
- `GET /api/offline-cache/user/:userId` - Get user cache
- `POST /api/offline-cache/set` - Set cache data
- `POST /api/offline-cache/sync` - Sync offline changes

### Crash Reporting

**Purpose**: Automatically collect and report crash information for debugging.

**Features**:
- Automatic crash detection
- Stack trace collection
- System information capture
- Crash report submission
- Admin crash report management

**Database Tables**:
- `crash_reports`: Crash report storage

**API Endpoints**:
- `POST /api/crash-reports/submit` - Submit crash report
- `GET /api/crash-reports` - List crash reports (admin)
- `PUT /api/crash-reports/:id/resolve` - Mark report as resolved

### UI Customization

**Purpose**: Allow users to customize the desktop application interface.

**Features**:
- Theme selection (light/dark/auto)
- Font size adjustment
- Custom color schemes
- Layout customization
- Settings import/export

**Components**:
- `settings.js` - Settings management
- `settings-ui.html` - Settings interface
- `settings-ui.js` - Settings UI logic

## Remote Features Enhancements

### File Transfer Limits & Logging

**Purpose**: Enhanced file transfer capabilities with limits and comprehensive logging.

**Features**:
- Configurable file size limits
- File type restrictions
- Transfer progress tracking
- Detailed transfer logs
- Bulk transfer operations

**Database Tables**:
- `file_transfer_logs`: Transfer activity logging

**API Endpoints**:
- `POST /api/file-transfer/upload/:userId` - Upload file to user
- `POST /api/file-transfer/download/:userId` - Download file from user
- `GET /api/file-transfer/logs` - Get transfer logs
- `PUT /api/file-transfer/limits` - Update transfer limits

### Clipboard Sharing

**Purpose**: Allow admins to push text directly to user's clipboard.

**Features**:
- Text, HTML, and URL content support
- Bulk clipboard operations
- Clipboard templates
- Usage tracking and analytics

**Database Tables**:
- `clipboard_sharing_logs`: Clipboard activity logging

**API Endpoints**:
- `POST /api/clipboard/send/:userId` - Send content to user clipboard
- `POST /api/clipboard/bulk-send` - Bulk clipboard operations
- `GET /api/clipboard/templates` - Get clipboard templates

### Remote Command Preset Library

**Purpose**: Provide admins with predefined commands for quick execution.

**Features**:
- Command template library
- Variable substitution
- Command validation
- Usage statistics
- Custom command creation

**Database Tables**:
- `command_presets`: Command template storage

**API Endpoints**:
- `GET /api/command-presets` - List command presets
- `POST /api/command-presets` - Create new preset
- `POST /api/command-presets/process-command` - Process command with variables

### Screen View Permission

**Purpose**: Require user approval before admin can view user's screen.

**Features**:
- Permission request system
- Time-limited permissions
- Permission history tracking
- Bulk permission requests
- Permission analytics

**Database Tables**:
- `screen_view_permissions`: Permission request tracking

**API Endpoints**:
- `POST /api/screen-view/request/:userId` - Request screen view permission
- `GET /api/screen-view/permissions` - List permission requests
- `POST /api/screen-view/cancel/:id` - Cancel permission request

## API Reference

### Authentication Endpoints

All API endpoints require proper authentication unless otherwise specified.

#### Authentication Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Common Response Formats

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Paginated Response**:
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### Rate Limiting

API endpoints are protected with rate limiting:
- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- Email-related endpoints: 10 requests per 15 minutes

### Error Codes

- `AUTH_REQUIRED`: Authentication required
- `AUTH_INVALID`: Invalid authentication token
- `PERMISSION_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `INTERNAL_ERROR`: Internal server error

## Configuration Guide

### Environment Variables

#### Database Configuration
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tweak_app
DB_USER=root
DB_PASSWORD=password
```

#### SMTP Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourapp.com
SMTP_FROM_NAME=Tweak Application
```

#### Security Configuration
```env
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30m
EMAIL_RATE_LIMIT_WINDOW=15m
EMAIL_RATE_LIMIT_MAX=10
VERIFICATION_CODE_EXPIRY=10m
```

#### Application Configuration
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=production
LOG_LEVEL=info
```

### Database Setup

1. Create MariaDB database:
```sql
CREATE DATABASE tweak_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Run schema initialization:
```bash
mysql -u root -p tweak_app < database/schema.sql
```

3. Create initial admin user:
```sql
INSERT INTO users (username, email, password, role, is_active) 
VALUES ('admin', 'admin@example.com', '$2b$10$...', 'superadmin', 1);
```

### Frontend Configuration

#### React Application Setup
```bash
cd frontend
npm install
npm start
```

#### Environment Variables
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=http://localhost:3001
```

### Desktop Application Setup

#### Electron Application
```bash
cd desktop-app
npm install
npm run electron:dev
```

#### Build for Production
```bash
npm run electron:build
```

### Webhook Configuration

#### Discord Webhook
1. Create webhook in Discord server settings
2. Configure in admin panel:
   - URL: `https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN`
   - Events: `user_login`, `user_registration`, `security_alert`

#### Slack Webhook
1. Create incoming webhook in Slack app settings
2. Configure in admin panel:
   - URL: `https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK`
   - Events: `user_login`, `user_registration`, `security_alert`

### Security Best Practices

1. **Database Security**:
   - Use strong passwords
   - Enable SSL connections
   - Regular security updates
   - Backup encryption

2. **Application Security**:
   - Use HTTPS in production
   - Implement proper CORS policies
   - Regular dependency updates
   - Input validation and sanitization

3. **SMTP Security**:
   - Use app-specific passwords
   - Enable 2FA on email accounts
   - Monitor email delivery rates
   - Implement rate limiting

4. **Webhook Security**:
   - Use HTTPS endpoints only
   - Implement webhook signatures
   - Monitor webhook delivery
   - Regular endpoint testing

### Monitoring and Maintenance

#### Log Monitoring
- Application logs: `/var/log/tweak-app/`
- Database logs: MariaDB error log
- Web server logs: Nginx/Apache access logs

#### Performance Monitoring
- Database query performance
- API response times
- Memory usage tracking
- Disk space monitoring

#### Backup Strategy
- Daily database backups
- Weekly configuration backups
- Monthly full system backups
- Test restore procedures regularly

### Troubleshooting

#### Common Issues

1. **Database Connection Issues**:
   - Check database credentials
   - Verify database server status
   - Check network connectivity
   - Review firewall settings

2. **SMTP Issues**:
   - Verify SMTP credentials
   - Check email provider settings
   - Review rate limiting
   - Test with different providers

3. **Authentication Issues**:
   - Check JWT secret configuration
   - Verify token expiration settings
   - Review user permissions
   - Check session management

4. **Webhook Issues**:
   - Verify webhook URLs
   - Check endpoint accessibility
   - Review webhook logs
   - Test with webhook testing tools

#### Debug Mode
Enable debug mode for detailed logging:
```env
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=tweak-app:*
```

#### Health Checks
Monitor application health:
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status
- Database connectivity check
- External service availability

This documentation provides comprehensive coverage of all enhanced features. For specific implementation details, refer to the individual service files and API documentation.