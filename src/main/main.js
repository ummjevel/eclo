const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { spawn } = require('child_process');
const fs = require('fs');

// Initialize store for settings
const store = new Store({
  defaults: {
    ttsModel: 'mlx-community/Fun-CosyVoice3-0.5B-2512-fp16',
    outputFormat: 'wav',
    sampleRate: 22050,
    language: 'ko',
    uiLanguage: 'ko',
    outputPath: app.getPath('music'),
    watermarkEnabled: true,
    termsAccepted: false,
    termsVersion: null,
    consentRecords: [],
    historyItems: []
  }
});

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Python TTS service management
function startPythonService() {
  const pythonPath = process.env.PYTHON_PATH || 'python3';
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'python', 'tts_service.py')
    : path.join(__dirname, '../python/tts_service.py');

  pythonProcess = spawn(pythonPath, [scriptPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python stdout: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    pythonProcess = null;
  });
}

function stopPythonService() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

// IPC Handlers

// Settings
ipcMain.handle('get-settings', () => {
  return store.store;
});

ipcMain.handle('set-setting', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('get-setting', (event, key) => {
  return store.get(key);
});

// TTS Model configuration with capabilities
ipcMain.handle('get-available-models', () => {
  return [
    {
      id: 'mlx-community/Fun-CosyVoice3-0.5B-2512-fp16',
      name: 'CosyVoice3 0.5B (Recommended)',
      size: '~1GB',
      languages: ['zh', 'en', 'ja', 'ko', 'de', 'es', 'fr', 'it', 'ru'],
      description: 'High quality multilingual TTS with voice cloning',
      capabilities: {
        voiceCloning: true,        // Supports custom voice cloning
        presetVoices: true,        // Supports preset voices
        speedControl: true,        // Supports speed adjustment
        styleInstruction: true,    // Supports style/instruct text
        languageSelection: true,   // Supports language selection
        referenceText: true        // Requires reference text for voice cloning
      }
    },
    {
      id: 'mlx-community/OuteTTS-0.2-500M-MLX',
      name: 'OuteTTS 0.2 500M',
      size: '~500MB',
      languages: ['en', 'zh', 'ja', 'ko'],
      description: 'Lightweight and fast TTS model',
      capabilities: {
        voiceCloning: true,
        presetVoices: true,
        speedControl: false,       // OuteTTS doesn't support speed control
        styleInstruction: false,
        languageSelection: true,
        referenceText: true
      }
    },
    {
      id: 'mlx-community/Kokoro-82M-MLX',
      name: 'Kokoro 82M',
      size: '~100MB',
      languages: ['en', 'ja'],
      description: 'Ultra lightweight model for basic TTS',
      capabilities: {
        voiceCloning: false,       // Kokoro doesn't support voice cloning
        presetVoices: false,
        speedControl: true,
        styleInstruction: false,
        languageSelection: true,
        referenceText: false
      }
    },
    {
      id: 'custom',
      name: 'Custom Model',
      size: 'Variable',
      languages: [],
      description: 'Use a custom MLX model path',
      capabilities: {
        voiceCloning: true,
        presetVoices: true,
        speedControl: true,
        styleInstruction: true,
        languageSelection: true,
        referenceText: true
      }
    }
  ];
});

ipcMain.handle('set-tts-model', (event, modelId) => {
  store.set('ttsModel', modelId);
  // Notify Python service of model change
  if (pythonProcess) {
    pythonProcess.stdin.write(JSON.stringify({ action: 'change_model', model: modelId }) + '\n');
  }
  return true;
});

// TTS Generation
ipcMain.handle('generate-tts', async (event, options) => {
  const { text, language, voiceSamplePath, referenceText, instructText, speed } = options;
  const modelId = store.get('ttsModel');
  const outputFormat = store.get('outputFormat');
  const outputPath = store.get('outputPath');

  const outputFile = path.join(outputPath, `eclo_${Date.now()}.${outputFormat}`);

  return new Promise((resolve, reject) => {
    // Use venv python if available in development
    const venvPythonPath = app.isPackaged
      ? null
      : path.join(__dirname, '../../.venv/bin/python3');
    const pythonPath = process.env.PYTHON_PATH || (venvPythonPath && require('fs').existsSync(venvPythonPath) ? venvPythonPath : 'python3');
    const scriptPath = app.isPackaged
      ? path.join(process.resourcesPath, 'python', 'tts_service.py')
      : path.join(__dirname, '../python/tts_service.py');

    const args = [
      scriptPath,
      '--action', 'generate',
      '--text', text,
      '--language', language,
      '--model', modelId,
      '--output', outputFile,
      '--speed', String(speed || 1.0)
    ];

    if (voiceSamplePath) {
      args.push('--ref-audio', voiceSamplePath);
    }
    if (referenceText) {
      args.push('--ref-text', referenceText);
    }
    if (instructText) {
      args.push('--instruct', instructText);
    }

    const ttsProcess = spawn(pythonPath, args);
    let stdout = '';
    let stderr = '';

    ttsProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ttsProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'progress' && mainWindow) {
              mainWindow.webContents.send('tts-progress', parsed.data);
            }
          } catch (e) {
            // Not JSON, add to stderr for error handling
            stderr += line + '\n';
          }
        }
      }
    });

    ttsProcess.on('close', (code) => {
      console.log('Python exit code:', code);
      console.log('Python stdout:', stdout);
      console.log('Python stderr:', stderr);

      // Try to parse JSON result from stdout first (regardless of exit code)
      // Python script outputs JSON with success/error info
      try {
        const result = JSON.parse(stdout.trim());
        if (result.success) {
          resolve(result);
        } else {
          // Script returned error in JSON format
          reject(new Error(result.error || 'TTS generation failed'));
        }
      } catch (e) {
        // No valid JSON in stdout
        console.log('JSON parse error:', e.message);
        if (code === 0) {
          resolve({ success: true, outputPath: outputFile });
        } else {
          // Filter out common Python warnings from stderr
          const errorLines = stderr.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed &&
              !trimmed.startsWith('Fetching') &&
              !trimmed.startsWith('Downloading') &&
              !trimmed.includes('tokenizer') &&
              !trimmed.includes('FutureWarning') &&
              !trimmed.includes('UserWarning') &&
              !trimmed.match(/^\d+%\|/);  // Progress bars
          }).join('\n').trim();
          reject(new Error(errorLines || 'TTS generation failed'));
        }
      }
    });
  });
});

// File dialogs
ipcMain.handle('select-voice-sample', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Voice Sample',
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'm4a', 'flac'] }
    ],
    properties: ['openFile']
  });
  return result.filePaths[0] || null;
});

// Get voice sample path (for preset voices)
ipcMain.handle('get-voice-sample-path', (event, voiceId) => {
  const voicesDir = app.isPackaged
    ? path.join(process.resourcesPath, 'voices')
    : path.join(__dirname, '../../assets/voices');

  return path.join(voicesDir, `${voiceId}.wav`);
});

ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Output Directory',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.filePaths[0]) {
    store.set('outputPath', result.filePaths[0]);
    return result.filePaths[0];
  }
  return store.get('outputPath');
});

// Save audio file with dialog
ipcMain.handle('save-audio-file', async (event, { sourcePath, format }) => {
  const formatFilters = {
    wav: { name: 'WAV Audio', extensions: ['wav'] },
    mp3: { name: 'MP3 Audio', extensions: ['mp3'] },
    ogg: { name: 'OGG Audio', extensions: ['ogg'] },
    flac: { name: 'FLAC Audio', extensions: ['flac'] }
  };

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Audio File',
    defaultPath: `eclo_${Date.now()}.${format}`,
    filters: [formatFilters[format] || formatFilters.wav]
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  try {
    // Check if format conversion is needed
    const sourceExt = path.extname(sourcePath).toLowerCase().slice(1);
    const targetExt = format.toLowerCase();

    if (sourceExt === targetExt || targetExt === 'wav') {
      // No conversion needed, just copy
      fs.copyFileSync(sourcePath, result.filePath);
      return { success: true, filePath: result.filePath };
    }

    // Use Python audio converter for format conversion
    const converterPath = app.isPackaged
      ? path.join(process.resourcesPath, 'python', 'audio_converter.py')
      : path.join(__dirname, '../python/audio_converter.py');

    const venvPythonPath = app.isPackaged
      ? null
      : path.join(__dirname, '../../.venv/bin/python3');
    const pythonPath = process.env.PYTHON_PATH || (venvPythonPath && fs.existsSync(venvPythonPath) ? venvPythonPath : 'python3');

    return new Promise((resolve) => {
      const convertProcess = spawn(pythonPath, [
        converterPath,
        '--input', sourcePath,
        '--output', result.filePath,
        '--format', targetExt
      ]);

      let stdout = '';
      let stderr = '';

      convertProcess.stdout.on('data', (data) => { stdout += data; });
      convertProcess.stderr.on('data', (data) => { stderr += data; });

      convertProcess.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          try {
            const convertResult = JSON.parse(stdout.trim());
            resolve(convertResult);
          } catch (e) {
            resolve({ success: true, filePath: result.filePath });
          }
        } else {
          // Fallback: just copy if conversion fails
          try {
            fs.copyFileSync(sourcePath, result.filePath);
            resolve({ success: true, filePath: result.filePath, warning: 'Format conversion failed, saved as original format' });
          } catch (copyError) {
            resolve({ success: false, error: stderr || 'Conversion failed' });
          }
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Consent management
ipcMain.handle('record-consent', (event, consentData) => {
  const records = store.get('consentRecords') || [];
  records.push({
    ...consentData,
    timestamp: new Date().toISOString(),
    version: '1.0'
  });
  store.set('consentRecords', records);
  store.set('termsAccepted', true);
  store.set('termsVersion', '1.0');
  return true;
});

ipcMain.handle('check-terms-accepted', () => {
  return store.get('termsAccepted');
});

// Open external links
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

// History management
ipcMain.handle('add-history-item', (event, item) => {
  const history = store.get('historyItems') || [];
  const newItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  };
  history.unshift(newItem); // Add to beginning
  // Keep only last 100 items
  if (history.length > 100) {
    history.pop();
  }
  store.set('historyItems', history);
  return newItem;
});

ipcMain.handle('get-history', () => {
  return store.get('historyItems') || [];
});

ipcMain.handle('delete-history-item', (event, id) => {
  const history = store.get('historyItems') || [];
  const filtered = history.filter(item => item.id !== id);
  store.set('historyItems', filtered);
  return true;
});

ipcMain.handle('clear-history', () => {
  store.set('historyItems', []);
  return true;
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopPythonService();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopPythonService();
});
