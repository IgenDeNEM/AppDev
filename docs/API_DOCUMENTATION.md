# API Documentation

This document provides comprehensive API documentation for the Tweak application backend.

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Admin Operations](#admin-operations)
4. [Security Features](#security-features)
5. [Remote Control](#remote-control)
6. [File Operations](#file-operations)
7. [Statistics & Analytics](#statistics--analytics)
8. [Webhooks](#webhooks)
9. [Error Handling](#error-handling)

## Base URL

```
Production: https://yourdomain.com/api
Development: http://localhost:3001/api
```

## Authentication

All API endpoints require authentication unless otherwise specified. Include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "superadmin",
    "isActive": true
  }
}
```

**2FA Response**:
```json
{
  "success": true,
  "requires2FA": true,
  "userId": 1,
  "message": "2FA verification required"
}
```

#### POST /auth/register
Register new user account.

**Request Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response**:
```json
{
  "success": true,
  "requiresVerification": true,
  "userId": 1,
  "message": "Email verification required"
}
```

#### POST /auth/verify-code
Verify email verification code.

**Request Body**:
```json
{
  "userId": 1,
  "code": "12345678",
  "type": "registration"
}
```

**Response**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "newuser",
    "email": "user@example.com",
    "role": "user",
    "isActive": true
  }
}
```

#### POST /auth/complete-2fa
Complete 2FA authentication.

**Request Body**:
```json
{
  "userId": 1,
  "code": "12345678"
}
```

**Response**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "superadmin",
    "isActive": true
  }
}
```

#### POST /auth/request-password-reset
Request password reset email.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### POST /auth/reset-password
Reset password with verification code.

**Request Body**:
```json
{
  "userId": 1,
  "code": "12345678",
  "newPassword": "newpassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### GET /auth/me
Get current user information.

**Response**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "superadmin",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T12:00:00.000Z",
    "securitySettings": {
      "twoFactorEnabled": true,
      "emailNotifications": true,
      "securityAlerts": true
    }
  }
}
```

## User Management

### User Operations

#### GET /admin/users
Get list of users with pagination and filtering.

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `search` (string): Search term
- `role` (string): Filter by role
- `status` (string): Filter by status (active/inactive)

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "superadmin",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLogin": "2024-01-01T12:00:00.000Z",
      "loginCount": 25,
      "tags": ["VIP", "Beta Tester"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### GET /admin/users/:id
Get specific user details.

**Response**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "superadmin",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T12:00:00.000Z",
    "loginCount": 25,
    "failedLoginAttempts": 0,
    "accountLockedUntil": null,
    "securitySettings": {
      "twoFactorEnabled": true,
      "emailNotifications": true,
      "securityAlerts": true
    },
    "tags": ["VIP", "Beta Tester"],
    "ipHistory": [
      {
        "ip": "192.168.1.100",
        "country": "United States",
        "city": "New York",
        "lastSeen": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

#### PUT /admin/users/:id
Update user information.

**Request Body**:
```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "role": "admin",
  "isActive": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "User updated successfully"
}
```

#### DELETE /admin/users/:id
Delete user account.

**Response**:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

#### POST /admin/users/:id/activate
Activate user account.

**Response**:
```json
{
  "success": true,
  "message": "User activated successfully"
}
```

#### POST /admin/users/:id/deactivate
Deactivate user account.

**Response**:
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

#### POST /admin/users/:id/lock
Lock user account.

**Request Body**:
```json
{
  "duration": 30,
  "reason": "Suspicious activity"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User account locked successfully"
}
```

#### POST /admin/users/:id/unlock
Unlock user account.

**Response**:
```json
{
  "success": true,
  "message": "User account unlocked successfully"
}
```

## Security Features

### IP Logging & Geolocation

#### GET /security/ip-logs
Get IP logs with filtering.

**Query Parameters**:
- `userId` (number): Filter by user ID
- `action` (string): Filter by action type
- `country` (string): Filter by country
- `startDate` (string): Start date (ISO format)
- `endDate` (string): End date (ISO format)
- `page` (number): Page number
- `limit` (number): Items per page

**Response**:
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "userId": 1,
      "ipAddress": "192.168.1.100",
      "country": "United States",
      "countryCode": "US",
      "region": "New York",
      "city": "New York",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "action": "login",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### GET /security/user/:userId/ip-history
Get user's IP history.

**Response**:
```json
{
  "success": true,
  "history": [
    {
      "ipAddress": "192.168.1.100",
      "country": "United States",
      "city": "New York",
      "firstSeen": "2024-01-01T00:00:00.000Z",
      "lastSeen": "2024-01-01T12:00:00.000Z",
      "loginCount": 5
    }
  ]
}
```

### Session Management

#### GET /security/sessions
Get active sessions.

**Query Parameters**:
- `userId` (number): Filter by user ID
- `limit` (number): Items per page

**Response**:
```json
{
  "success": true,
  "sessions": [
    {
      "id": 1,
      "userId": 1,
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "isActive": true,
      "lastActivity": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T11:00:00.000Z",
      "expiresAt": "2024-01-02T11:00:00.000Z"
    }
  ]
}
```

#### DELETE /security/sessions/:sessionId
Terminate specific session.

**Response**:
```json
{
  "success": true,
  "message": "Session terminated successfully"
}
```

#### DELETE /security/user/:userId/sessions
Terminate all user sessions.

**Response**:
```json
{
  "success": true,
  "message": "All user sessions terminated successfully"
}
```

### Audit Log Export

#### GET /security/export/audit-logs
Export audit logs.

**Query Parameters**:
- `format` (string): Export format (csv/pdf)
- `startDate` (string): Start date (ISO format)
- `endDate` (string): End date (ISO format)
- `userId` (number): Filter by user ID
- `action` (string): Filter by action type

**Response**: File download (CSV or PDF)

#### POST /security/schedule-export
Schedule automated audit log export.

**Request Body**:
```json
{
  "schedule": "0 2 * * *",
  "format": "csv",
  "email": "admin@example.com",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Export scheduled successfully"
}
```

## Remote Control

### Command Execution

#### POST /remote/execute/:userId
Execute command on user's system.

**Request Body**:
```json
{
  "command": "dir",
  "timeout": 30,
  "description": "List directory contents"
}
```

**Response**:
```json
{
  "success": true,
  "commandId": "cmd_123456",
  "message": "Command execution initiated"
}
```

#### GET /remote/command/:commandId/status
Get command execution status.

**Response**:
```json
{
  "success": true,
  "status": "completed",
  "result": "Directory listing...",
  "exitCode": 0,
  "executionTime": 1.5
}
```

### Screen View

#### POST /screen-view/request/:userId
Request screen view permission.

**Request Body**:
```json
{
  "reason": "Technical support",
  "duration": 60
}
```

**Response**:
```json
{
  "success": true,
  "requestId": "req_123456",
  "expiresAt": "2024-01-01T13:00:00.000Z",
  "message": "Screen view permission requested"
}
```

#### GET /screen-view/permissions
Get screen view permission requests.

**Response**:
```json
{
  "success": true,
  "permissions": [
    {
      "id": 1,
      "adminId": 1,
      "userId": 2,
      "status": "pending",
      "reason": "Technical support",
      "expiresAt": "2024-01-01T13:00:00.000Z",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

#### POST /screen-view/cancel/:id
Cancel screen view request.

**Response**:
```json
{
  "success": true,
  "message": "Screen view request cancelled"
}
```

## File Operations

### File Transfer

#### POST /file-transfer/upload/:userId
Upload file to user's system.

**Request**: Multipart form data
- `file`: File to upload
- `description`: Optional description

**Response**:
```json
{
  "success": true,
  "transferId": "transfer_123456",
  "fileInfo": {
    "name": "document.pdf",
    "size": 1024000,
    "type": "application/pdf"
  },
  "message": "File upload initiated"
}
```

#### POST /file-transfer/download/:userId
Download file from user's system.

**Request Body**:
```json
{
  "filePath": "C:\\Users\\User\\Documents\\file.txt",
  "description": "Download user document"
}
```

**Response**:
```json
{
  "success": true,
  "transferId": "transfer_123456",
  "fileInfo": {
    "name": "file.txt",
    "size": 512000,
    "path": "C:\\Users\\User\\Documents\\file.txt"
  },
  "message": "File download initiated"
}
```

#### GET /file-transfer/status/:transferId
Get file transfer status.

**Response**:
```json
{
  "success": true,
  "status": "completed",
  "progress": 100,
  "fileInfo": {
    "name": "document.pdf",
    "size": 1024000,
    "transferred": 1024000
  }
}
```

#### GET /file-transfer/logs
Get file transfer logs.

**Query Parameters**:
- `userId` (number): Filter by user ID
- `adminId` (number): Filter by admin ID
- `status` (string): Filter by status
- `startDate` (string): Start date
- `endDate` (string): End date

**Response**:
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "adminId": 1,
      "userId": 2,
      "fileName": "document.pdf",
      "fileSize": 1024000,
      "transferType": "upload",
      "status": "completed",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "completedAt": "2024-01-01T12:01:00.000Z"
    }
  ]
}
```

### Clipboard Sharing

#### POST /clipboard/send/:userId
Send content to user's clipboard.

**Request Body**:
```json
{
  "content": "Hello, World!",
  "contentType": "text",
  "description": "Send greeting message"
}
```

**Response**:
```json
{
  "success": true,
  "logId": 1,
  "message": "Content sent to user clipboard successfully"
}
```

#### POST /clipboard/bulk-send
Send content to multiple users.

**Request Body**:
```json
{
  "userIds": [1, 2, 3],
  "content": "System maintenance notice",
  "contentType": "text",
  "description": "Maintenance notification"
}
```

**Response**:
```json
{
  "success": true,
  "sentCount": 3,
  "failedCount": 0,
  "logIds": [1, 2, 3],
  "message": "Content sent to multiple users successfully"
}
```

#### GET /clipboard/logs
Get clipboard sharing logs.

**Response**:
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "adminId": 1,
      "userId": 2,
      "contentType": "text",
      "contentPreview": "Hello, World!",
      "status": "delivered",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

## Statistics & Analytics

### Key Statistics

#### GET /key-statistics/dashboard
Get comprehensive dashboard statistics.

**Query Parameters**:
- `period` (string): Time period (7d, 30d, 90d, 1y)

**Response**:
```json
{
  "success": true,
  "overview": {
    "totalKeys": 1000,
    "activeKeys": 750,
    "dailyKeys": [
      {
        "date": "2024-01-01",
        "keys_generated": 25
      }
    ],
    "roleStats": [
      {
        "role": "user",
        "count": 900,
        "active_count": 675
      }
    ]
  },
  "activationRate": {
    "totalGenerated": 1000,
    "totalActivated": 750,
    "activationRate": "75.00"
  },
  "retentionStats": {
    "totalUsers": 1000,
    "returningUsers": 600,
    "retentionRate": "60.00"
  }
}
```

#### GET /key-statistics/activation-rate
Get key activation rate statistics.

**Response**:
```json
{
  "success": true,
  "activationRate": {
    "totalGenerated": 1000,
    "totalActivated": 750,
    "activatedInPeriod": 50,
    "activationRate": "75.00",
    "periodActivationRate": "5.00"
  }
}
```

#### GET /key-statistics/location
Get key usage by geographic location.

**Response**:
```json
{
  "success": true,
  "locationStats": [
    {
      "country": "United States",
      "country_code": "US",
      "unique_users": 500,
      "total_logins": 2500
    }
  ]
}
```

### Advanced Search

#### POST /advanced-search/users
Advanced user search with multiple filters.

**Request Body**:
```json
{
  "searchTerm": "admin",
  "role": "admin",
  "status": "active",
  "registrationDateFrom": "2024-01-01",
  "registrationDateTo": "2024-12-31",
  "hasTags": "true",
  "tags": [1, 2],
  "country": "United States",
  "sortBy": "created_at",
  "sortOrder": "DESC",
  "limit": 50,
  "offset": 0
}
```

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLogin": "2024-01-01T12:00:00.000Z",
      "tags": ["VIP", "Beta Tester"],
      "totalLogins": 25,
      "activeSessions": 1
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 2
}
```

#### GET /advanced-search/suggestions
Get user search suggestions.

**Query Parameters**:
- `q` (string): Search query
- `limit` (number): Maximum suggestions

**Response**:
```json
{
  "success": true,
  "suggestions": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLogin": "2024-01-01T12:00:00.000Z",
      "tags": ["VIP"]
    }
  ]
}
```

## Webhooks

### Webhook Management

#### GET /webhooks
Get list of configured webhooks.

**Response**:
```json
{
  "success": true,
  "webhooks": [
    {
      "id": 1,
      "name": "Discord Notifications",
      "url": "https://discord.com/api/webhooks/...",
      "events": ["user_login", "user_registration"],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /webhooks
Create new webhook.

**Request Body**:
```json
{
  "name": "Slack Alerts",
  "url": "https://hooks.slack.com/services/...",
  "events": ["security_alert", "user_registration"],
  "secretKey": "webhook_secret_key",
  "headers": {
    "Content-Type": "application/json"
  }
}
```

**Response**:
```json
{
  "success": true,
  "webhookId": 2,
  "message": "Webhook created successfully"
}
```

#### PUT /webhooks/:id
Update webhook configuration.

**Request Body**:
```json
{
  "name": "Updated Slack Alerts",
  "events": ["security_alert", "user_registration", "user_login"],
  "isActive": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook updated successfully"
}
```

#### DELETE /webhooks/:id
Delete webhook.

**Response**:
```json
{
  "success": true,
  "message": "Webhook deleted successfully"
}
```

#### POST /webhooks/:id/test
Test webhook delivery.

**Response**:
```json
{
  "success": true,
  "message": "Test webhook sent successfully"
}
```

#### GET /webhooks/:id/logs
Get webhook delivery logs.

**Response**:
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "eventType": "user_login",
      "responseStatus": 200,
      "responseBody": "OK",
      "sentAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

## Error Handling

### Error Response Format

All API endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `AUTH_INVALID` | 401 | Invalid authentication token |
| `AUTH_EXPIRED` | 401 | Authentication token expired |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `ACCOUNT_LOCKED` | 423 | Account is locked |
| `VERIFICATION_REQUIRED` | 403 | Email verification required |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Validation Errors

When validation fails, the response includes detailed field errors:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "username": "Username is required",
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

### Rate Limiting

API endpoints are protected with rate limiting:

- **General endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes
- **Email-related endpoints**: 10 requests per 15 minutes

When rate limit is exceeded:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900
}
```

## WebSocket Events

The application uses WebSocket for real-time communication:

### Connection

Connect to WebSocket:
```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'jwt_token_here'
  }
});
```

### Events

#### Client to Server

- `authenticate`: Authenticate WebSocket connection
- `execute_command`: Execute command on user system
- `screen_capture`: Send screen capture data
- `status_update`: Update user status

#### Server to Client

- `authenticated`: Authentication successful
- `authentication_error`: Authentication failed
- `command_result`: Command execution result
- `screen_capture_received`: Screen capture received
- `user_status_update`: User status updated
- `user_connected`: User connected
- `user_disconnected`: User disconnected

### Example Usage

```javascript
// Authenticate
socket.emit('authenticate', {
  userId: 1,
  username: 'admin',
  isAdmin: true
});

// Listen for command results
socket.on('command_result', (data) => {
  console.log('Command result:', data);
});

// Send screen capture
socket.emit('screen_capture', {
  imageData: 'base64_image_data',
  adminId: 1
});
```

This API documentation provides comprehensive coverage of all endpoints and features. For additional examples and integration guides, refer to the specific service documentation files.