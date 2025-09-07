# API Documentation

This document provides comprehensive API documentation for the Tweak Application backend.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "error": "Error message (if any)"
}
```

## Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Authentication Endpoints

### POST /auth/login

Login with username and password.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "isAdmin": true
  }
}
```

### POST /auth/register

Register a new user with a registration key.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "registrationKey": "uuid-string"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "userId": 1
}
```

### POST /auth/logout

Logout the current user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Logout successful"
}
```

### GET /auth/me

Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "is_admin": true,
    "is_online": true,
    "last_login": "2024-01-01T12:00:00.000Z",
    "created_at": "2024-01-01T10:00:00.000Z"
  }
}
```

## Admin Endpoints

All admin endpoints require admin privileges.

### User Management

#### GET /admin/users

Get list of all users.

**Headers:** `Authorization: Bearer <admin-token>`

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "is_admin": true,
      "is_online": true,
      "last_login": "2024-01-01T12:00:00.000Z",
      "created_at": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

#### POST /admin/add-admin

Promote a user to admin.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "userId": 1
}
```

**Response:**
```json
{
  "message": "User promoted to admin successfully"
}
```

#### POST /admin/remove-admin

Remove admin privileges from a user.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "userId": 1
}
```

**Response:**
```json
{
  "message": "Admin privileges removed successfully"
}
```

#### POST /admin/reset-password

Reset a user's password.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "userId": 1,
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

#### GET /admin/online-users

Get list of currently online users.

**Headers:** `Authorization: Bearer <admin-token>`

**Response:**
```json
{
  "onlineUsers": [
    {
      "id": 1,
      "username": "user1",
      "email": "user1@example.com",
      "is_admin": false,
      "last_login": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### Key Management

#### POST /admin/generate-key

Generate a new registration key.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "expiresInHours": 24
}
```

**Response:**
```json
{
  "message": "Registration key generated successfully",
  "key": "uuid-string-here",
  "expiresAt": "2024-01-02T12:00:00.000Z",
  "keyId": 1
}
```

#### GET /admin/keys

Get list of all registration keys.

**Headers:** `Authorization: Bearer <admin-token>`

**Response:**
```json
{
  "keys": [
    {
      "id": 1,
      "key_value": "uuid-string-here",
      "is_used": false,
      "expires_at": "2024-01-02T12:00:00.000Z",
      "created_at": "2024-01-01T12:00:00.000Z",
      "used_at": null,
      "generated_by_username": "admin",
      "used_by_username": null
    }
  ]
}
```

### Activity Logs

#### GET /admin/logs

Get activity logs with pagination and filtering.

**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `userId` (optional): Filter by user ID

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "action": "user_login",
      "details": "Username: admin",
      "ip_address": "127.0.0.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2024-01-01T12:00:00.000Z",
      "username": "admin"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

## Remote Control Endpoints

All remote control endpoints require admin privileges.

### Command Execution

#### POST /remote/execute-command

Execute a command on a user's machine.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "targetUserId": 1,
  "command": "dir"
}
```

**Response:**
```json
{
  "message": "Command queued for execution",
  "commandId": 1,
  "status": "pending"
}
```

#### GET /remote/command-history

Get command execution history.

**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `targetUserId` (optional): Filter by target user ID

**Response:**
```json
{
  "commands": [
    {
      "id": 1,
      "command": "dir",
      "status": "executed",
      "result": "Directory listing...",
      "created_at": "2024-01-01T12:00:00.000Z",
      "executed_at": "2024-01-01T12:00:01.000Z",
      "admin_username": "admin",
      "target_username": "user1"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "pages": 1
  }
}
```

#### PUT /remote/command-status/:commandId

Update command execution status (called by desktop app).

**Request Body:**
```json
{
  "status": "executed",
  "result": "Command output here"
}
```

**Response:**
```json
{
  "message": "Command status updated successfully"
}
```

### Screen Capture

#### POST /remote/request-screen-capture

Request a screen capture from a user's machine.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "targetUserId": 1
}
```

**Response:**
```json
{
  "message": "Screen capture request sent",
  "targetUserId": 1
}
```

#### GET /remote/screen-captures

Get screen capture history.

**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `targetUserId` (optional): Filter by target user ID

**Response:**
```json
{
  "captures": [
    {
      "id": 1,
      "created_at": "2024-01-01T12:00:00.000Z",
      "admin_username": "admin",
      "target_username": "user1"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### GET /remote/screen-capture/:captureId

Get a specific screen capture image.

**Headers:** `Authorization: Bearer <admin-token>`

**Response:** Binary image data (PNG format)

## WebSocket Events

The application uses Socket.IO for real-time communication.

### Connection

Connect to the WebSocket server:

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Client Events

#### authenticate

Authenticate with the server.

```javascript
socket.emit('authenticate', {
  userId: 1,
  username: 'admin',
  isAdmin: true
});
```

#### execute_command

Send command execution result (desktop app only).

```javascript
socket.emit('execute_command', {
  commandId: 1,
  command: 'dir',
  result: 'Directory listing...',
  status: 'executed'
});
```

#### screen_capture

Send screen capture data (desktop app only).

```javascript
socket.emit('screen_capture', {
  imageData: 'base64-encoded-image',
  adminId: 1
});
```

#### status_update

Send status update.

```javascript
socket.emit('status_update', {
  status: 'online'
});
```

### Server Events

#### authenticated

Authentication confirmation.

```javascript
socket.on('authenticated', (data) => {
  console.log('Authenticated:', data);
});
```

#### command_result

Command execution result (admin only).

```javascript
socket.on('command_result', (data) => {
  console.log('Command result:', data);
});
```

#### screen_capture_received

Screen capture received (admin only).

```javascript
socket.on('screen_capture_received', (data) => {
  console.log('Screen capture:', data);
});
```

#### user_status_update

User status update (admin only).

```javascript
socket.on('user_status_update', (data) => {
  console.log('User status:', data);
});
```

#### user_disconnected

User disconnected (admin only).

```javascript
socket.on('user_disconnected', (data) => {
  console.log('User disconnected:', data);
});
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## Error Handling

### Validation Errors

```json
{
  "error": "Validation failed",
  "errors": [
    {
      "field": "username",
      "message": "Username is required"
    }
  ]
}
```

### Authentication Errors

```json
{
  "error": "Access token required"
}
```

### Authorization Errors

```json
{
  "error": "Admin access required"
}
```

### Server Errors

```json
{
  "error": "Internal server error"
}
```

## Examples

### Complete Login Flow

```javascript
// 1. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin123'
  })
});

const loginData = await loginResponse.json();
const token = loginData.token;

// 2. Use token for authenticated requests
const usersResponse = await fetch('/api/admin/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const usersData = await usersResponse.json();
```

### WebSocket Connection

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Authenticate
  socket.emit('authenticate', {
    userId: 1,
    username: 'admin',
    isAdmin: true
  });
});

socket.on('authenticated', (data) => {
  console.log('Authentication successful:', data);
});
```

This API documentation covers all available endpoints and their usage. For additional help or questions, refer to the main README or contact the development team.