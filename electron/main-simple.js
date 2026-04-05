const { app, BrowserWindow } = require('electron');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Medixor - Medical Inventory System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: __dirname + '/icon.ico',
  });

  // Load your Vercel deployment
  mainWindow.loadURL('https://medixor.vercel.app/');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
