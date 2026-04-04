const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextServer;

const isDev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Medixor - Medical Inventory System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    show: false, // Don't show until ready
  });

  const startURL = `http://localhost:${port}`;

  // Show window when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(startURL);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    // In production, Next.js is in .next folder relative to resources
    const nextDir = isDev 
      ? process.cwd()
      : path.join(process.resourcesPath, 'app');
    
    console.log('Next.js directory:', nextDir);
    console.log('Starting Next.js server on port', port);

    // Use node to run Next.js start script directly
    const next = spawn(process.execPath, [
      path.join(nextDir, 'node_modules', 'next', 'dist', 'bin', 'next'),
      'start',
      '-p',
      port.toString()
    ], {
      cwd: nextDir,
      env: { ...process.env, PORT: port },
      stdio: 'pipe'
    });

    let serverReady = false;

    next.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Next.js: ${output}`);
      
      // Check if server started
      if (output.includes('Ready') || output.includes('started server') || output.includes(`localhost:${port}`)) {
        if (!serverReady) {
          serverReady = true;
          console.log('Next.js server is ready!');
          resolve();
        }
      }
    });

    next.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    next.on('error', (err) => {
      console.error('Failed to start Next.js:', err);
      reject(err);
    });

    next.on('close', (code) => {
      console.log(`Next.js process exited with code ${code}`);
      serverReady = false;
    });

    nextServer = next;
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        console.log('Server start timeout, proceeding anyway...');
        resolve();
      }
    }, 30000);
  });
}

app.on('ready', async () => {
  console.log('Electron app ready');
  console.log('App path:', app.getAppPath());
  console.log('Resources path:', process.resourcesPath);
  
  try {
    console.log('Starting Next.js server...');
    await startNextServer();
    console.log('Creating window...');
    createWindow();
  } catch (error) {
    console.error('Failed to start:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});
