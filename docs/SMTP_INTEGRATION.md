# SMTP Integration & Email Verification System

This document provides comprehensive information about the SMTP integration and email verification system implemented in the Tweak Application.

## Overview

The Tweak Application now includes a complete SMTP email system with 8-digit verification codes for enhanced security. The system supports multiple email flows including registration verification, two-factor authentication, password resets, and security alerts.

## Features

### 🔒 Email Verification System
- **8-digit numeric codes** for all verification processes
- **Configurable expiry times** (default: 5-10 minutes)
- **Rate limiting** to prevent abuse
- **Attempt tracking** with maximum retry limits
- **Automatic cleanup** of expired codes

### 📧 Email Flows
1. **Registration Verification** - New users must verify their email
2. **Two-Factor Authentication** - Optional 2FA for enhanced security
3. **Password Reset** - Secure password reset via email
4. **Password Change Confirmation** - Verify password changes
5. **Admin Account Creation** - Notify new admin accounts
6. **Role Change Alerts** - Notify users of permission changes
7. **Security Alerts** - Multiple failed login attempts, suspicious activity

### 🛡️ Security Features
- **Brute-force protection** on both password and code entry
- **Account locking** after multiple failed attempts
- **Rate limiting** on email-triggered actions
- **IP tracking** and user agent logging
- **Comprehensive audit trail** of all email activities

## SMTP Configuration

### Database Configuration

The system stores SMTP configurations in the `smtp_config` table:

```sql
CREATE TABLE smtp_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    secure BOOLEAN DEFAULT FALSE,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Environment Variables

Configure SMTP settings in your `.env` file:

```env
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
ACCOUNT_LOCKOUT_DURATION=30
EMAIL_RATE_LIMIT_WINDOW=15
EMAIL_RATE_LIMIT_MAX=10
VERIFICATION_CODE_EXPIRY=10
```

### Popular SMTP Providers

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use App Password, not regular password
```

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-password
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### Amazon SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-ses-username
SMTP_PASSWORD=your-ses-password
```

## API Endpoints

### Email Verification

#### Send Verification Code
```http
POST /api/email/send-verification-code
Content-Type: application/json

{
  "email": "user@example.com",
  "type": "registration",
  "userId": 123
}
```

**Types:**
- `registration` - New user registration
- `login_2fa` - Two-factor authentication
- `password_reset` - Password reset request
- `password_change` - Password change confirmation
- `admin_creation` - Admin account creation
- `role_change` - Role/permission changes
- `security_alert` - Security notifications

#### Verify Code
```http
POST /api/email/verify-code
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "12345678",
  "type": "registration"
}
```

### SMTP Management (Admin Only)

#### Get SMTP Configuration
```http
GET /api/smtp/config
Authorization: Bearer <admin-token>
```

#### Create/Update SMTP Configuration
```http
POST /api/smtp/config
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "username": "your-email@gmail.com",
  "password": "your-app-password",
  "from_email": "noreply@tweak.com",
  "from_name": "Tweak Application",
  "is_active": true
}
```

#### Test SMTP Connection
```http
POST /api/smtp/test-connection
Authorization: Bearer <admin-token>
```

#### Get Email Statistics
```http
GET /api/email/stats
Authorization: Bearer <admin-token>
```

## Database Schema

### Email Verification Codes
```sql
CREATE TABLE email_verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    email VARCHAR(100) NOT NULL,
    code VARCHAR(8) NOT NULL,
    type ENUM('registration', 'login_2fa', 'password_reset', 'password_change', 'admin_creation', 'role_change', 'security_alert') NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Email Logs
```sql
CREATE TABLE email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    email VARCHAR(100) NOT NULL,
    type ENUM('verification_code', 'password_reset', 'admin_alert', 'security_alert', 'system_notification') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status ENUM('sent', 'delivered', 'failed', 'bounced') DEFAULT 'sent',
    error_message TEXT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### User Security Settings
```sql
CREATE TABLE user_security_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    failed_login_attempts INT DEFAULT 0,
    last_failed_login TIMESTAMP NULL,
    account_locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_security (user_id)
);
```

## Email Templates

The system includes professionally designed HTML email templates for all verification types:

### Registration Email
- Welcome message
- 8-digit verification code prominently displayed
- Expiry time information
- Security notice

### Two-Factor Authentication
- Security-focused messaging
- Code display with security warning
- Instructions for suspicious activity

### Password Reset
- Clear reset instructions
- Code display
- Security recommendations

### Security Alerts
- Alert styling with red accents
- Detailed information about the security event
- Recommended actions

## Security Implementation

### Rate Limiting
- **Email requests**: 10 per 15 minutes per email address
- **Verification codes**: 3 per 5 minutes per email/type combination
- **Failed attempts**: 5 before account lockout

### Brute Force Protection
- **Password attempts**: 5 failed attempts locks account for 30 minutes
- **Code attempts**: 3 failed attempts invalidates the code
- **IP tracking**: All attempts logged with IP and user agent

### Account Locking
- Automatic lockout after maximum failed attempts
- Configurable lockout duration
- Email notifications for lockouts
- Admin override capabilities

## Admin Dashboard Features

### Email Management Section
1. **SMTP Configuration**
   - Add/edit/delete SMTP configurations
   - Test connection functionality
   - Multiple configuration support

2. **Email Statistics**
   - Email delivery rates
   - Verification code usage statistics
   - Failed delivery tracking

3. **Email Logs**
   - Complete audit trail
   - Filter by type, status, user
   - Export functionality

### User Management Enhancements
- **Security settings** for each user
- **Two-factor authentication** toggle
- **Account lockout** management
- **Security event** monitoring

## Frontend Integration

### React Admin Dashboard
- **Email Management** tab with full SMTP configuration
- **Statistics dashboard** with charts and metrics
- **Email logs** with filtering and search
- **Test email** functionality

### Login/Registration Flow
- **Email verification** step after registration
- **Two-factor authentication** for login
- **Password reset** with email verification
- **Responsive design** for all verification screens

### Desktop Application
- **Email verification** screen for 2FA
- **Code input** with proper formatting
- **Resend functionality** with rate limiting
- **Error handling** for expired/invalid codes

## Usage Examples

### Registration Flow
1. User registers with valid registration key
2. System sends verification email automatically
3. User enters 8-digit code from email
4. Account activated upon successful verification

### Two-Factor Authentication
1. User enables 2FA in security settings
2. Login requires email verification code
3. Code sent automatically during login
4. User enters code to complete authentication

### Password Reset
1. User requests password reset
2. System sends reset code to registered email
3. User enters code and new password
4. Password updated upon successful verification

### Admin Notifications
1. System automatically sends alerts for:
   - Multiple failed login attempts
   - New admin account creation
   - Role/permission changes
   - Suspicious activity detection

## Troubleshooting

### Common Issues

#### SMTP Connection Failed
- Verify SMTP credentials
- Check firewall settings
- Ensure correct port and security settings
- Test with SMTP provider's documentation

#### Emails Not Delivered
- Check spam/junk folders
- Verify sender reputation
- Review email logs for error messages
- Test with different email providers

#### Verification Codes Not Working
- Check code expiry time
- Verify rate limiting settings
- Review database for expired codes
- Check email delivery status

#### Rate Limiting Issues
- Adjust rate limit settings in environment
- Review failed attempt logs
- Check for automated attacks
- Implement additional security measures

### Debugging

#### Enable Debug Logging
```javascript
// In emailService.js
console.log('SMTP Debug:', {
  host: this.smtpConfig.host,
  port: this.smtpConfig.port,
  secure: this.smtpConfig.secure
});
```

#### Check Database
```sql
-- Check recent verification codes
SELECT * FROM email_verification_codes 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY created_at DESC;

-- Check email logs
SELECT * FROM email_logs 
WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY sent_at DESC;

-- Check user security settings
SELECT * FROM user_security_settings 
WHERE failed_login_attempts > 0;
```

## Best Practices

### Security
1. **Use App Passwords** for Gmail/Outlook
2. **Enable 2FA** on SMTP accounts
3. **Regular security audits** of email logs
4. **Monitor failed attempts** and lockouts
5. **Keep SMTP credentials secure**

### Performance
1. **Clean up expired codes** regularly
2. **Monitor email delivery rates**
3. **Optimize database queries** for logs
4. **Use connection pooling** for SMTP
5. **Implement email queuing** for high volume

### User Experience
1. **Clear error messages** for users
2. **Resend functionality** with rate limiting
3. **Mobile-responsive** email templates
4. **Accessibility** considerations
5. **Multi-language support** for templates

## Future Enhancements

### Planned Features
- **Email templates** customization
- **Multi-language** support
- **Advanced analytics** and reporting
- **Webhook integration** for delivery status
- **Email scheduling** capabilities
- **Template variables** and personalization
- **A/B testing** for email templates
- **Advanced rate limiting** with IP whitelisting

### Integration Opportunities
- **SMS verification** as alternative
- **Push notifications** for mobile apps
- **Webhook notifications** for external systems
- **API integrations** with email providers
- **Advanced security** with device fingerprinting

This comprehensive SMTP integration provides a robust, secure, and user-friendly email verification system that enhances the overall security and user experience of the Tweak Application.