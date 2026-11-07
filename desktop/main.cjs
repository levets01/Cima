const { app, BrowserWindow, Menu, dialog, ipcMain, shell, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { fork } = require('node:child_process');
const { pathToFileURL } = require('node:url');

// Keep data in the same location through installations and upgrades.
app.setName('Cima');
if (process.env.CIMA_TEST_DATA_DIR) app.setPath('userData', process.env.CIMA_TEST_DATA_DIR);
else app.setPath('userData', path.join(app.getPath('localAppData'), 'Cima'));
app.setAppUserModelId('co.cima.prestamos');

let mainWindow;
let backend;
let runtime;
let quitting = false;
let requestId = 0;
const requests = new Map();
const dataDirectory = path.join(app.getPath('userData'), 'data');
const logDirectory = path.join(app.getPath('userData'), 'logs');
const backendDirectory = app.isPackaged ? path.join(process.resourcesPath, 'backend') : path.join(__dirname, '..', 'backend');

function getJwtSecret() {
  fs.mkdirSync(dataDirectory, { recursive: true });
  const file = path.join(dataDirectory, 'runtime.json');
  if (fs.existsSync(file)) {
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof config.jwtSecret !== 'string' || config.jwtSecret.length < 32) throw new Error('La configuración local está dañada. Revisa data/runtime.json antes de continuar.');
    return config.jwtSecret;
  }
  const config = { jwtSecret: crypto.randomBytes(48).toString('hex') };
  fs.writeFileSync(file, JSON.stringify(config), { mode: 0o600, flag: 'wx' });
  return config.jwtSecret;
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const jwtSecret = getJwtSecret();
    fs.mkdirSync(logDirectory, { recursive: true });
    const log = fs.createWriteStream(path.join(logDirectory, 'backend.log'), { flags: 'a' });
    log.on('error', (error) => { console.error('No se pudo escribir el registro local:', error.message); if (!runtime) reject(error); });
    const apiKey = crypto.randomBytes(32).toString('hex');
    const databasePath = path.join(dataDirectory, 'cima.db').replaceAll('\\', '/');
    backend = fork(path.join(backendDirectory, 'dist', 'desktop.js'), [], {
      execPath: process.execPath,
      cwd: backendDirectory,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production',
        CIMA_DESKTOP: 'true', CIMA_DESKTOP_KEY: apiKey, PORT: '0', HOST: '127.0.0.1',
        FRONTEND_URL: 'null', JWT_SECRET: jwtSecret, JWT_EXPIRES_IN: '30d',
        DATABASE_URL: `file:${databasePath}`, CIMA_MIGRATIONS_DIR: path.join(backendDirectory, 'prisma', 'migrations'),
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    backend.stdout.pipe(log, { end: false });
    backend.stderr.pipe(log, { end: false });
    const timer = setTimeout(() => reject(new Error('La base de datos tardó demasiado en iniciar. Consulta logs/backend.log.')), 45000);
    backend.on('error', (error) => { clearTimeout(timer); reject(error); });
    backend.on('message', (message) => {
      if (message.type === 'ready') {
        clearTimeout(timer);
        runtime = { apiUrl: `http://127.0.0.1:${message.port}/api`, apiKey, appVersion: app.getVersion() };
        resolve(runtime);
      } else if (message.type === 'startup-error') {
        clearTimeout(timer); reject(new Error(message.error));
      } else if (message.type === 'response') {
        const request = requests.get(message.id);
        if (request) { requests.delete(message.id); clearTimeout(request.timer); if (message.error) request.reject(new Error(message.error)); else request.resolve(message.result); }
      }
    });
    backend.on('exit', (code) => {
      clearTimeout(timer);log.end();
      for (const request of requests.values()) { clearTimeout(request.timer); request.reject(new Error('La base de datos se cerró.')); }
      requests.clear();
      if (!runtime) reject(new Error(`No se pudo iniciar la base de datos (${code}). Consulta logs/backend.log.`));
      else if (!quitting) { dialog.showErrorBox('Cima', 'La base de datos se cerró inesperadamente. Vuelve a abrir Cima.'); app.quit(); }
    });
  });
}

async function backupDatabase() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar copia de seguridad', defaultPath: path.join(app.getPath('documents'), `Cima-respaldo-${stamp}.db`),
    filters: [{ name: 'Base de datos Cima', extensions: ['db'] }],
  });
  if (result.canceled || !result.filePath) return null;
  const destination = path.resolve(result.filePath);
  // VACUUM INTO requires a fresh file. Refuse overwrite so existing copies stay intact.
  if (fs.existsSync(destination)) throw new Error('Elige un nombre nuevo para conservar la copia anterior.');
  return requestBackup(destination);
}

function requestBackup(destination) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const timer = setTimeout(() => { requests.delete(id); reject(new Error('La copia tardó demasiado. Comprueba la carpeta elegida.')); }, 60000);
    requests.set(id, { resolve, reject, timer });
    backend.send({ type: 'backup', id, destination });
  });
}

function verifySender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error('Solicitud no autorizada');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380, height: 900, minWidth: 900, minHeight: 650, title: 'Cima · Préstamos', backgroundColor: '#f7f3f5', show: false,
    icon: path.join(__dirname, 'resources', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true,
      additionalArguments: [`--cima-runtime=${encodeURIComponent(JSON.stringify(runtime))}`] },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  const expected = new URL(pathToFileURL(indexPath).href);
  const checkNavigation = (event, url) => {
    const target = new URL(url);
    if (target.protocol !== 'file:' || target.hostname || target.pathname !== expected.pathname || target.search) event.preventDefault();
  };
  mainWindow.webContents.on('will-navigate', checkNavigation);
  mainWindow.webContents.on('will-redirect', checkNavigation);
  mainWindow.loadFile(indexPath).catch((error) => { dialog.showErrorBox('No se pudo abrir Cima', error.message); app.quit(); });
  if (process.env.CIMA_SMOKE_TEST === 'true') {
    mainWindow.webContents.once('did-finish-load', async () => {
      try {
        const smokeRenderer = require('./smoke-renderer.cjs');
        const result = await mainWindow.webContents.executeJavaScript(`(${smokeRenderer.toString()})()`);
        if (result.phase === 'initial') {
          const destination = path.join(app.getPath('userData'), 'smoke-backup.db');
          await requestBackup(destination);
          if (!fs.statSync(destination).size) throw new Error('La copia local quedó vacía');
          result.backup = true;
        }
        const capture = await mainWindow.webContents.capturePage();
        fs.writeFileSync(path.join(app.getPath('userData'), `smoke-${result.phase}.png`), capture.toPNG());
        session.defaultSession.flushStorageData();
        console.log('CIMA_SMOKE_OK '+JSON.stringify(result));app.quit();
      } catch(error) { console.error('CIMA_SMOKE_FAIL',error);app.exit(1); }
    });
  }
}

const locked = app.requestSingleInstanceLock();
if (!locked) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(async () => {
    await startBackend();
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    // The packaged renderer only needs its own files and the private loopback API.
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => callback({ responseHeaders: { ...details.responseHeaders,
      'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src http://127.0.0.1:*; object-src 'none'; base-uri 'self'; frame-src 'none'"],
    } }));
    ipcMain.handle('cima:open-data-folder', async (event) => { verifySender(event); const error = await shell.openPath(dataDirectory); if(error)throw new Error(error); });
    ipcMain.handle('cima:backup-database', async (event) => { verifySender(event); return backupDatabase(); });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Archivo', submenu: [
        { label: 'Crear copia de seguridad…', click: () => backupDatabase().catch((error) => dialog.showErrorBox('Copia de seguridad', error.message)) },
        { label: 'Abrir carpeta de datos', click: () => shell.openPath(dataDirectory) },
        { type: 'separator' }, { role: 'quit', label: 'Salir' },
      ] },
      { label: 'Edición', submenu: [{ role: 'undo', label: 'Deshacer' }, { role: 'redo', label: 'Rehacer' }, { type: 'separator' }, { role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' }, { role: 'selectAll', label: 'Seleccionar todo' }] },
      { label: 'Vista', submenu: [{ role: 'resetZoom', label: 'Tamaño original' }, { role: 'zoomIn', label: 'Acercar' }, { role: 'zoomOut', label: 'Alejar' }, { role: 'togglefullscreen', label: 'Pantalla completa' }] },
    ]));
    createWindow();
  }).catch((error) => { if(process.env.CIMA_SMOKE_TEST === 'true') { console.error('CIMA_SMOKE_FAIL',error);app.exit(1);return; } dialog.showErrorBox('No se pudo iniciar Cima', `${error.message}\n\nTus datos están en: ${dataDirectory}`); app.quit(); });
}
app.on('window-all-closed', () => app.quit());
app.on('before-quit', (event) => {
  if (quitting || !backend || !backend.connected || backend.exitCode !== null || backend.signalCode !== null) return;
  event.preventDefault();quitting = true;
  backend.once('exit', () => app.quit());
  backend.send({ type: 'shutdown' });
  setTimeout(() => { backend.kill();app.quit(); }, 5500).unref();
});
