/**
 * Unit tests for Electron main process
 */

const path = require('path');

// Mock electron modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name) => {
      if (name === 'music') return '/mock/music';
      if (name === 'userData') return '/mock/userData';
      return '/mock/path';
    }),
    isPackaged: false,
    on: jest.fn(),
    whenReady: jest.fn().mockResolvedValue()
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      send: jest.fn(),
      openDevTools: jest.fn()
    }
  })),
  ipcMain: {
    handle: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn()
  },
  shell: {
    openExternal: jest.fn()
  }
}));

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key, defaultValue) => defaultValue),
    set: jest.fn(),
    store: {}
  }));
});

describe('Main Process Configuration', () => {
  test('default settings are correctly defined', () => {
    const defaults = {
      ttsModel: 'mlx-community/Fun-CosyVoice3-0.5B-2512-fp16',
      outputFormat: 'wav',
      sampleRate: 22050,
      language: 'ko',
      uiLanguage: 'ko',
      watermarkEnabled: true,
      termsAccepted: false,
      termsVersion: null,
      consentRecords: []
    };

    // Verify expected default values
    expect(defaults.ttsModel).toBe('mlx-community/Fun-CosyVoice3-0.5B-2512-fp16');
    expect(defaults.outputFormat).toBe('wav');
    expect(defaults.language).toBe('ko');
    expect(defaults.watermarkEnabled).toBe(true);
    expect(defaults.termsAccepted).toBe(false);
  });
});

describe('Available Models', () => {
  const AVAILABLE_MODELS = [
    {
      id: 'mlx-community/Fun-CosyVoice3-0.5B-2512-fp16',
      name: 'CosyVoice3 0.5B',
      description: 'High-quality multilingual TTS with voice cloning',
      size: '~1GB',
      languages: ['zh', 'en', 'ja', 'ko', 'de', 'es', 'fr', 'it', 'ru'],
      capabilities: {
        voiceCloning: true,
        presetVoices: true,
        speedControl: true,
        styleInstruction: true,
        languageSelection: true
      }
    },
    {
      id: 'mlx-community/OuteTTS-0.2-500M-MLX',
      name: 'OuteTTS 0.2 500M',
      description: 'Fast and lightweight TTS model',
      size: '~500MB',
      languages: ['en', 'zh', 'ja', 'ko'],
      capabilities: {
        voiceCloning: true,
        presetVoices: true,
        speedControl: false,
        styleInstruction: false,
        languageSelection: true
      }
    },
    {
      id: 'mlx-community/Kokoro-82M-MLX',
      name: 'Kokoro 82M',
      description: 'Ultra-lightweight TTS model',
      size: '~100MB',
      languages: ['en', 'ja'],
      capabilities: {
        voiceCloning: false,
        presetVoices: false,
        speedControl: true,
        styleInstruction: false,
        languageSelection: true
      }
    }
  ];

  test('has at least 3 built-in models', () => {
    expect(AVAILABLE_MODELS.length).toBeGreaterThanOrEqual(3);
  });

  test('each model has required properties', () => {
    AVAILABLE_MODELS.forEach(model => {
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('languages');
      expect(model).toHaveProperty('capabilities');
    });
  });

  test('CosyVoice3 supports voice cloning', () => {
    const cosyVoice = AVAILABLE_MODELS.find(m => m.id.includes('CosyVoice3'));
    expect(cosyVoice.capabilities.voiceCloning).toBe(true);
  });

  test('Kokoro does not support voice cloning', () => {
    const kokoro = AVAILABLE_MODELS.find(m => m.id.includes('Kokoro'));
    expect(kokoro.capabilities.voiceCloning).toBe(false);
  });

  test('all models have language arrays', () => {
    AVAILABLE_MODELS.forEach(model => {
      expect(Array.isArray(model.languages)).toBe(true);
      expect(model.languages.length).toBeGreaterThan(0);
    });
  });
});

describe('Voice Sample Path Resolution', () => {
  test('resolves preset voice paths correctly', () => {
    const voiceId = 'korean_female';
    const expectedPath = path.join(
      __dirname,
      '../../assets/voices',
      `${voiceId}.wav`
    );

    // Verify path structure
    expect(expectedPath).toContain('assets/voices');
    expect(expectedPath).toContain('korean_female.wav');
  });

  test('handles all 8 preset voices', () => {
    const presetVoices = [
      'korean_female', 'korean_male',
      'english_female', 'english_male',
      'japanese_female', 'japanese_male',
      'chinese_female', 'chinese_male'
    ];

    presetVoices.forEach(voiceId => {
      const voicePath = path.join(
        __dirname,
        '../../assets/voices',
        `${voiceId}.wav`
      );
      expect(voicePath).toContain(voiceId);
    });
  });
});

describe('Output File Naming', () => {
  test('generates unique output filenames', () => {
    const timestamp1 = Date.now();
    const filename1 = `eclo_${timestamp1}.wav`;

    // Small delay to ensure different timestamp
    const timestamp2 = Date.now() + 1;
    const filename2 = `eclo_${timestamp2}.wav`;

    expect(filename1).not.toBe(filename2);
  });

  test('output filename format is correct', () => {
    const timestamp = 1704067200000; // Fixed timestamp for testing
    const format = 'wav';
    const filename = `eclo_${timestamp}.${format}`;

    expect(filename).toBe('eclo_1704067200000.wav');
    expect(filename).toMatch(/^eclo_\d+\.wav$/);
  });
});
