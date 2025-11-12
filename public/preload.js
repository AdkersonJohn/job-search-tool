const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  newSearch: () => ipcRenderer.send("new-search"),
  onNewSearch: (callback) => ipcRenderer.on("new-search", callback),
});
