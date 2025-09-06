# Tweak Application

A comprehensive system optimization and remote management application with an admin dashboard and desktop client.

## Features

### Admin Dashboard
- **User Management**: Add/remove admins, reset passwords, view online users
- **Registration Key System**: Generate and manage registration keys for new users
- **Remote Control**: Execute commands on user machines, request screen captures
- **Activity Logging**: Comprehensive logging of all system activities
- **Real-time Monitoring**: Monitor online users and system status

### Desktop Application
- **System Optimization**: Clean temporary files, optimize performance
- **System Monitoring**: Real-time memory, disk, and network monitoring
- **Remote Management**: Accept remote commands and screen capture requests
- **System Information**: Detailed system specs and status
- **Security**: Secure authentication and encrypted communication

## Architecture

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
                       └─────────────────┘
```

## Prerequisites

- Node.js (v16 or higher)
- MariaDB (v10.3 or higher)
- npm or yarn

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd tweak-application
```

### 2. Database Setup

1. Install MariaDB on your system
2. Create a database for the application:

```sql
CREATE DATABASE tweak_app;
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

Edit `.env` file with your database credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tweak_app
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h
PORT=3001
NODE_ENV=development
ADMIN_EMAIL=admin@tweak.com
ADMIN_PASSWORD=admin123
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

### 5. Desktop App Setup

```bash
cd desktop-app
npm install
```

## Running the Application

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

## Usage

### Admin Dashboard

1. Open your browser and navigate to `http://localhost:3000`
2. Login with admin credentials (default: admin/admin123)
3. Use the dashboard to:
   - Generate registration keys for new users
   - Manage user accounts and permissions
   - Monitor online users
   - Execute remote commands
   - View activity logs

### Desktop Application

1. Launch the desktop application
2. Login with your user credentials (you'll need a registration key from an admin)
3. Use the application to:
   - Monitor system performance
   - Run system optimizations
   - Accept remote management commands
   - View system information

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Admin Management
- `GET /api/admin/users` - List all users
- `POST /api/admin/add-admin` - Promote user to admin
- `POST /api/admin/remove-admin` - Remove admin privileges
- `POST /api/admin/reset-password` - Reset user password
- `GET /api/admin/online-users` - Get online users

### Key Management
- `POST /api/admin/generate-key` - Generate registration key
- `GET /api/admin/keys` - List all registration keys

### Remote Control
- `POST /api/remote/execute-command` - Execute command on user machine
- `GET /api/remote/command-history` - Get command history
- `POST /api/remote/request-screen-capture` - Request screen capture
- `GET /api/remote/screen-captures` - Get screen captures

### Activity Logs
- `GET /api/admin/logs` - Get activity logs

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - Unique email address
- `password_hash` - Hashed password
- `registration_key` - Key used for registration
- `is_admin` - Admin flag
- `is_online` - Online status
- `last_login` - Last login timestamp
- `created_at` - Account creation timestamp

### Registration Keys Table
- `id` - Primary key
- `key_value` - Unique registration key
- `generated_by` - Admin who generated the key
- `used_by` - User who used the key
- `is_used` - Usage status
- `expires_at` - Expiration timestamp
- `created_at` - Key creation timestamp

### Activity Logs Table
- `id` - Primary key
- `user_id` - User who performed the action
- `action` - Action performed
- `details` - Additional details
- `ip_address` - IP address
- `user_agent` - User agent string
- `created_at` - Timestamp

### Remote Commands Table
- `id` - Primary key
- `admin_id` - Admin who executed the command
- `target_user_id` - Target user
- `command` - Command executed
- `status` - Execution status
- `result` - Command result
- `executed_at` - Execution timestamp
- `created_at` - Creation timestamp

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Configured CORS policies
- **Helmet Security**: Security headers middleware

## Deployment

### Docker Deployment

1. **Create Dockerfile for Backend**:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

2. **Create docker-compose.yml**:
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
    ports:
      - "3306:3306"

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DB_HOST: database
      DB_PASSWORD: rootpassword
    depends_on:
      - database

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  db_data:
```

### Production Considerations

1. **Environment Variables**: Use proper environment variables for production
2. **Database Security**: Use strong passwords and restrict database access
3. **SSL/TLS**: Enable HTTPS for production deployment
4. **Firewall**: Configure firewall rules appropriately
5. **Monitoring**: Set up application monitoring and logging
6. **Backups**: Implement regular database backups

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Check MariaDB is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **Frontend Not Loading**:
   - Check if backend is running on port 3001
   - Verify proxy configuration in package.json

3. **Desktop App Not Connecting**:
   - Ensure backend server is running
   - Check firewall settings
   - Verify network connectivity

### Logs

- Backend logs: Check console output
- Frontend logs: Check browser developer tools
- Desktop app logs: Check console output in development mode

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please contact the development team or create an issue in the repository.