const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

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
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
