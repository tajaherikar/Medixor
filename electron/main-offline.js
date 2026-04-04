const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let nextServerProcess;
const PORT = 3456; // Fixed port to avoid conflicts

function checkServerReady(retries = 50) {
  return new Promise((resolve) => {
    const checkServer = () => {
      http.get(`http://localhost:${PORT}`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve(true);
        } else if (retries > 0) {
          setTimeout(() => checkServer(), 200);
          retries--;
        } else {
          resolve(false);
        }
      }).on('error', () => {
        if (retries > 0) {
          setTimeout(() => checkServer(), 200);
          retries--;
        } else {
          resolve(false);
        }
      });
    };
    checkServer();
  });
}

function startNextServer() {
  return new Promise(async (resolve, reject) => {
    const isDev = !app.isPackaged;
    
    let nextPath, nodePath, nextDir;
    
    if (isDev) {
      // Development: use project directory
      nextDir = process.cwd();
      nodePath = process.execPath;
      nextPath = path.join(nextDir, 'node_modules', 'next', 'dist', 'bin', 'next');
    } else {
      // Production: use bundled standalone server
      const resourcesPath = process.resourcesPath;
      nextDir = path.join(resourcesPath, 'app', '.next', 'standalone');
      nodePath = path.join(resourcesPath, 'app', 'node.exe'); // Bundled Node.js
      nextPath = path.join(nextDir, 'server.js');
      
      console.log('Production mode');
      console.log('Resources path:', resourcesPath);
      console.log('Next directory:', nextDir);
      console.log('Node path:', nodePath);
      console.log('Server path:', nextPath);
    }

    const env = {
      ...process.env,
      PORT: PORT.toString(),
      NODE_ENV: 'production',
      HOSTNAME: '0.0.0.0'
    };

    console.log(`Starting Next.js server on port ${PORT}...`);
    
    const serverProcess = spawn(
      nodePath,
      isDev ? [nextPath, 'start', '-p', PORT.toString()] : [nextPath],
      {
        cwd: nextDir,
        env: env,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    serverProcess.stdout.on('data', (data) => {
      console.log('Next.js:', data.toString().trim());
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Next.js Error:', data.toString().trim());
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start Next.js server:', err);
      reject(err);
    });

    serverProcess.on('close', (code) => {
      console.log(`Next.js server exited with code ${code}`);
    });

    nextServerProcess = serverProcess;

    // Wait for server to be ready
    const ready = await checkServerReady();
    if (ready) {
      console.log('Next.js server is ready!');
      resolve();
    } else {
      reject(new Error('Server failed to start within timeout'));
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Medixor - Medical Inventory System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startNextServer();
    createWindow();
  } catch (err) {
    console.error('Failed to start application:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  if (nextServerProcess) {
    nextServerProcess.kill();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
