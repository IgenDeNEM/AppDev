# Setup Guide

This guide will walk you through setting up the Tweak Application on your local development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MariaDB** (v10.3 or higher) - [Download here](https://mariadb.org/download/)
- **Git** - [Download here](https://git-scm.com/)

## Step 1: Database Setup

### Install MariaDB

1. Download and install MariaDB from the official website
2. During installation, set a root password (remember this!)
3. Start the MariaDB service

### Create Database

1. Open a terminal/command prompt
2. Connect to MariaDB:
```bash
mysql -u root -p
```

3. Create the database:
```sql
CREATE DATABASE tweak_app;
SHOW DATABASES;
EXIT;
```

4. Import the database schema:
```bash
mysql -u root -p tweak_app < backend/database/schema.sql
```

## Step 2: Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit the `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mariadb_password
DB_NAME=tweak_app
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=24h
PORT=3001
NODE_ENV=development
ADMIN_EMAIL=admin@tweak.com
ADMIN_PASSWORD=admin123
```

5. Start the backend server:
```bash
npm run dev
```

The backend should now be running on `http://localhost:3001`

## Step 3: Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend should now be running on `http://localhost:3000`

## Step 4: Desktop App Setup

1. Open a new terminal and navigate to the desktop app directory:
```bash
cd desktop-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the desktop application:
```bash
npm run dev
```

## Step 5: Initial Admin Setup

1. Open your browser and go to `http://localhost:3000`
2. You should see the login screen
3. Use the default admin credentials:
   - Username: `admin`
   - Password: `admin123`

4. Once logged in, you can:
   - Generate registration keys for new users
   - Manage user accounts
   - Monitor system activity

## Step 6: Testing the Desktop App

1. Launch the desktop application
2. You'll need a registration key to create a new user account
3. Go to the admin dashboard and generate a registration key
4. Use that key to register a new user account in the desktop app
5. Login with your new user credentials

## Verification

To verify everything is working correctly:

1. **Backend**: Check `http://localhost:3001/api/health` - should return status OK
2. **Frontend**: Should load the admin dashboard at `http://localhost:3000`
3. **Desktop App**: Should show the login screen
4. **Database**: Should have the required tables created

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. Ensure MariaDB is running
2. Check your database credentials in the `.env` file
3. Verify the database exists:
```sql
SHOW DATABASES;
USE tweak_app;
SHOW TABLES;
```

### Port Conflicts

If you get port conflicts:

1. Check if ports 3000, 3001, or 3306 are already in use
2. Kill processes using those ports or change the ports in configuration files

### Permission Issues

If you get permission errors:

1. On Windows: Run terminal as Administrator
2. On macOS/Linux: Use `sudo` if necessary

## Next Steps

Once everything is set up:

1. Explore the admin dashboard features
2. Test user registration and login
3. Try the remote control features
4. Check the activity logs
5. Test the desktop application features

## Development Tips

- Use `npm run dev` for development with auto-reload
- Check browser console for frontend errors
- Check terminal output for backend errors
- Use the database directly to inspect data if needed

## Getting Help

If you encounter issues:

1. Check the console/terminal output for error messages
2. Verify all prerequisites are installed correctly
3. Ensure all services are running
4. Check the troubleshooting section in the main README