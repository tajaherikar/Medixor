const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;

// Auto-updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Medixor - Medical Inventory System',
    icon: 'app-icon.ico',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Inject a global flag to detect Electron
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load Vercel app (works online)
  // The hybrid DB layer will use localStorage when offline/in Electron
  mainWindow.loadURL('https://medixor.vercel.app/');
  
  // Remove menu bar for cleaner look
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle offline state  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (errorCode === -106) { // ERR_INTERNET_DISCONNECTED
      mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    }
  });

  // Check for updates after window loads
  mainWindow.webContents.on('did-finish-load', () => {
    // Only check for updates in production
    if (!app.isPackaged) {
      console.log('Development mode - skipping update check');
      return;
    }
    
    console.log('Checking for updates...');
    autoUpdater.checkForUpdates();
  });
}

// Auto-updater event handlers
autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', {
      type: 'available',
      version: info.version
    });
  }
  // Auto-download the update
  autoUpdater.downloadUpdate();
});

autoUpdater.on('update-not-available', (info) => {
  console.log('App is up to date:', info.version);
});

autoUpdater.on('download-progress', (progressObj) => {
  const message = `Download: ${Math.round(progressObj.percent)}%`;
  console.log(message);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', {
      type: 'downloading',
      percent: Math.round(progressObj.percent)
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', {
      type: 'ready',
      version: info.version
    });
  }
  // Will install on quit
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
