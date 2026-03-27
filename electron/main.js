const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Desabilita aceleração de hardware se necessário (corrige bugs visuais em algumas GPUs no Windows)
// app.disableHardwareAcceleration();

let mainWindow;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Tenta resolver o ícone de forma segura
  let iconPath = path.join(__dirname, '../public/favicon.ico');
  if (!fs.existsSync(iconPath)) {
    // Fallback se estiver rodando dentro do asar ou caminho dist diferente
    iconPath = path.join(__dirname, '../dist/favicon.ico');
  }

  mainWindow = new BrowserWindow({
    width: Math.min(1280, width),
    height: Math.min(800, height),
    title: 'HydroFlow Pro',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Mantido false para compatibilidade com o código atual (require, etc)
      devTools: !app.isPackaged,
      webSecurity: false // Permite carregar recursos locais em alguns cenários de dev
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (!app.isPackaged) {
    // Modo Desenvolvimento
    mainWindow.loadURL('http://localhost:5173').catch(e => console.error(e));
    console.log('Running in Development Mode');
  } else {
    // Modo Produção (Electron Packaged)
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch(e => console.error('Failed to load app:', e));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
