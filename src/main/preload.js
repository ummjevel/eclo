const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ecloAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),

  // TTS Models
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  setTTSModel: (modelId) => ipcRenderer.invoke('set-tts-model', modelId),

  // TTS Generation
  generateTTS: (options) => ipcRenderer.invoke('generate-tts', options),

  // File dialogs
  selectVoiceSample: () => ipcRenderer.invoke('select-voice-sample'),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  getVoiceSamplePath: (voiceId) => ipcRenderer.invoke('get-voice-sample-path', voiceId),
  saveAudioFile: (sourcePath, format) => ipcRenderer.invoke('save-audio-file', { sourcePath, format }),

  // Consent
  recordConsent: (data) => ipcRenderer.invoke('record-consent', data),
  checkTermsAccepted: () => ipcRenderer.invoke('check-terms-accepted'),

  // History
  addHistoryItem: (item) => ipcRenderer.invoke('add-history-item', item),
  getHistory: () => ipcRenderer.invoke('get-history'),
  deleteHistoryItem: (id) => ipcRenderer.invoke('delete-history-item', id),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Event listeners
  onProgress: (callback) => {
    ipcRenderer.on('tts-progress', (event, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('tts-progress');
  }
});
