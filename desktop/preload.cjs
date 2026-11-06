const { contextBridge, ipcRenderer } = require('electron');
const value = process.argv.find((argument) => argument.startsWith('--cima-runtime='));
if (value) {
  const runtime = JSON.parse(decodeURIComponent(value.slice('--cima-runtime='.length)));
  contextBridge.exposeInMainWorld('cimaDesktop', {
    isDesktop: true,
    apiUrl: runtime.apiUrl,
    apiKey: runtime.apiKey,
    appVersion: runtime.appVersion,
    openDataFolder: () => ipcRenderer.invoke('cima:open-data-folder'),
    backupDatabase: () => ipcRenderer.invoke('cima:backup-database'),
  });
}
