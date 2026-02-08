/**
 * Eclo - Renderer Application
 * Multilingual TTS & Voice Cloning
 */

class EcloApp {
  constructor() {
    this.currentView = 'tts';
    this.selectedVoice = null;  // For TTS preset voice
    this.currentAudio = null;
    this.currentAudioPath = null;  // Path to current generated audio for saving
    this.previewAudio = null;
    this.settings = {};
    this.availableModels = [];
    this.currentModelCapabilities = null;  // Current model's capabilities

    // Preset voices configuration with reference text
    this.presetVoices = [
      { id: 'korean_female', name: 'Sora', lang: 'Korean', emoji: '👩', langCode: 'ko', refText: '안녕하세요, 만나서 반갑습니다.' },
      { id: 'korean_male', name: 'Minho', lang: 'Korean', emoji: '👨', langCode: 'ko', refText: '안녕하세요, 저는 민호입니다.' },
      { id: 'english_female', name: 'Emma', lang: 'English', emoji: '👩', langCode: 'en', refText: 'Hello, nice to meet you.' },
      { id: 'english_male', name: 'James', lang: 'English', emoji: '👨', langCode: 'en', refText: 'Hello, my name is James.' },
      { id: 'japanese_female', name: 'Yuki', lang: 'Japanese', emoji: '👩', langCode: 'ja', refText: 'こんにちは、はじめまして。' },
      { id: 'japanese_male', name: 'Kenji', lang: 'Japanese', emoji: '👨', langCode: 'ja', refText: 'こんにちは、健二です。' },
      { id: 'chinese_female', name: 'Mei', lang: 'Chinese', emoji: '👩', langCode: 'zh', refText: '你好，很高兴认识你。' },
      { id: 'chinese_male', name: 'Wei', lang: 'Chinese', emoji: '👨', langCode: 'zh', refText: '你好，我叫小伟。' },
    ];

    this.init();
  }

  async init() {
    // Check if terms are accepted
    const termsAccepted = await window.ecloAPI.checkTermsAccepted();

    if (!termsAccepted) {
      this.showConsentModal();
    } else {
      this.hideConsentModal();
    }

    // Load settings and models
    await this.loadSettings();
    await this.loadModels();

    // Render preset voices
    this.renderPresetVoices();

    // Setup event listeners
    this.setupEventListeners();
    this.setupConsentListeners();
    this.setupNavigationListeners();
    this.setupTTSListeners();
    this.setupSettingsListeners();
  }

  // Consent Modal
  showConsentModal() {
    document.getElementById('consent-modal').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
  }

  hideConsentModal() {
    document.getElementById('consent-modal').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
  }

  setupConsentListeners() {
    const checkboxes = [
      document.getElementById('terms-agree'),
      document.getElementById('voice-rights-agree'),
      document.getElementById('no-illegal-agree')
    ];

    const continueBtn = document.getElementById('consent-continue');

    const checkAllAgreed = () => {
      const allAgreed = checkboxes.every(cb => cb.checked);
      continueBtn.disabled = !allAgreed;
    };

    checkboxes.forEach(cb => {
      cb.addEventListener('change', checkAllAgreed);
    });

    continueBtn.addEventListener('click', async () => {
      await window.ecloAPI.recordConsent({
        termsAgreed: true,
        voiceRightsAgreed: true,
        noIllegalAgreed: true
      });
      this.hideConsentModal();
    });
  }

  // Settings
  async loadSettings() {
    this.settings = await window.ecloAPI.getSettings();
    this.updateSettingsUI();
  }

  async loadModels() {
    this.availableModels = await window.ecloAPI.getAvailableModels();
    this.renderModelList();
    this.updateCurrentModelCapabilities();
  }

  updateCurrentModelCapabilities() {
    const currentModel = this.availableModels.find(m => m.id === this.settings.ttsModel);
    this.currentModelCapabilities = currentModel?.capabilities || {
      voiceCloning: true,
      presetVoices: true,
      speedControl: true,
      styleInstruction: true,
      languageSelection: true,
      referenceText: true
    };
    this.updateUIBasedOnCapabilities();
  }

  updateUIBasedOnCapabilities() {
    const caps = this.currentModelCapabilities;

    // Voice selection section (preset + custom)
    const voiceSelectorGroup = document.querySelector('.voice-selector')?.closest('.form-group');
    const selectedVoiceInfo = document.getElementById('selected-voice-info');
    if (voiceSelectorGroup) {
      if (caps.voiceCloning || caps.presetVoices) {
        voiceSelectorGroup.classList.remove('hidden');
        if (selectedVoiceInfo) selectedVoiceInfo.classList.remove('hidden');
      } else {
        voiceSelectorGroup.classList.add('hidden');
        if (selectedVoiceInfo) selectedVoiceInfo.classList.add('hidden');
        this.selectedVoice = null;  // Clear selection if voice cloning not supported
      }
    }

    // Custom voice button
    const addCustomVoiceBtn = document.getElementById('add-custom-voice-btn');
    if (addCustomVoiceBtn) {
      addCustomVoiceBtn.style.display = caps.voiceCloning ? '' : 'none';
    }

    // Speed control
    const speedGroup = document.getElementById('tts-speed')?.closest('.form-group');
    if (speedGroup) {
      speedGroup.style.display = caps.speedControl ? '' : 'none';
    }

    // Style instruction
    const styleGroup = document.getElementById('tts-style')?.closest('.form-group');
    if (styleGroup) {
      styleGroup.style.display = caps.styleInstruction ? '' : 'none';
    }

    // Language selection - filter based on model's supported languages
    const languageSelect = document.getElementById('tts-language');
    const languageGroup = languageSelect?.closest('.form-group');
    if (languageGroup) {
      languageGroup.style.display = caps.languageSelection ? '' : 'none';
    }

    // Update supported languages in dropdown
    if (languageSelect) {
      const currentModel = this.availableModels.find(m => m.id === this.settings.ttsModel);
      const supportedLangs = currentModel?.languages || [];

      if (supportedLangs.length > 0) {
        Array.from(languageSelect.options).forEach(option => {
          option.disabled = !supportedLangs.includes(option.value);
        });

        // Select first supported language if current is not supported
        if (!supportedLangs.includes(languageSelect.value)) {
          const firstSupported = Array.from(languageSelect.options).find(opt => !opt.disabled);
          if (firstSupported) {
            languageSelect.value = firstSupported.value;
          }
        }
      } else {
        // Enable all for custom model
        Array.from(languageSelect.options).forEach(option => {
          option.disabled = false;
        });
      }
    }

    this.updateGenerateButtonState();
  }

  updateSettingsUI() {
    // Update current model display
    const currentModel = this.availableModels.find(m => m.id === this.settings.ttsModel);
    document.getElementById('current-model').textContent = currentModel?.name || 'CosyVoice3';

    // Update settings
    document.getElementById('watermark-enabled').checked = this.settings.watermarkEnabled !== false;
    document.getElementById('ui-language').value = this.settings.uiLanguage || 'ko';
  }

  renderModelList() {
    const modelList = document.getElementById('model-list');
    modelList.innerHTML = '';

    this.availableModels.filter(m => m.id !== 'custom').forEach(model => {
      const isSelected = model.id === this.settings.ttsModel;
      const card = document.createElement('div');
      card.className = `model-card ${isSelected ? 'selected' : ''}`;
      card.dataset.modelId = model.id;

      // Build capability badges
      const capabilityBadges = this.getCapabilityBadges(model.capabilities);

      card.innerHTML = `
        <input type="radio" name="tts-model" ${isSelected ? 'checked' : ''}>
        <span class="model-radio"></span>
        <div class="model-info-content">
          <div class="model-name">${model.name}</div>
          <div class="model-desc">${model.description}</div>
          <div class="model-size">Size: ${model.size} | Languages: ${model.languages.join(', ')}</div>
          <div class="model-capabilities">${capabilityBadges}</div>
        </div>
      `;

      card.addEventListener('click', () => this.selectModel(model.id));
      modelList.appendChild(card);
    });
  }

  getCapabilityBadges(capabilities) {
    if (!capabilities) return '';

    const badgeConfig = [
      { key: 'voiceCloning', label: 'Voice Cloning', icon: '🎤' },
      { key: 'speedControl', label: 'Speed', icon: '⚡' },
      { key: 'styleInstruction', label: 'Style', icon: '🎨' },
    ];

    return badgeConfig
      .filter(config => capabilities[config.key])
      .map(config => `<span class="capability-badge" title="${config.label}">${config.icon} ${config.label}</span>`)
      .join('');
  }

  async selectModel(modelId) {
    await window.ecloAPI.setTTSModel(modelId);
    this.settings.ttsModel = modelId;
    this.renderModelList();
    this.updateSettingsUI();
    this.updateCurrentModelCapabilities();  // Update UI based on new model's capabilities
  }

  // Preset Voices
  renderPresetVoices() {
    const container = document.getElementById('preset-voices');
    container.innerHTML = '';

    this.presetVoices.forEach(voice => {
      const card = document.createElement('div');
      card.className = 'voice-card';
      card.dataset.voiceId = voice.id;

      card.innerHTML = `
        <div class="voice-avatar">${voice.emoji}</div>
        <div class="voice-label">${voice.name}</div>
        <div class="voice-lang">${voice.lang}</div>
      `;

      card.addEventListener('click', () => this.selectPresetVoice(voice));
      container.appendChild(card);
    });

    // Add custom voice button listener
    document.getElementById('add-custom-voice-btn').addEventListener('click', async () => {
      const filePath = await window.ecloAPI.selectVoiceSample();
      if (filePath) {
        this.selectCustomVoice(filePath);
      }
    });

    // Preview button
    document.getElementById('preview-voice-btn').addEventListener('click', () => {
      this.previewSelectedVoice();
    });
  }

  selectPresetVoice(voice) {
    // Update UI
    document.querySelectorAll('.voice-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.voiceId === voice.id);
    });

    this.selectedVoice = {
      type: 'preset',
      id: voice.id,
      name: voice.name,
      path: `voices/${voice.id}.wav`,  // Path to preset voice sample
      langCode: voice.langCode
    };

    // Update selected voice info
    document.querySelector('#selected-voice-info .voice-name').textContent = voice.name;
    document.getElementById('preview-voice-btn').disabled = false;

    // Hide reference text input for preset voice (presets have built-in ref text)
    document.getElementById('custom-voice-ref-container').classList.add('hidden');

    // Auto-select matching language
    document.getElementById('tts-language').value = voice.langCode;

    this.updateGenerateButtonState();
  }

  selectCustomVoice(filePath) {
    // Deselect preset voices
    document.querySelectorAll('.voice-card').forEach(card => {
      card.classList.remove('selected');
    });

    const fileName = filePath.split('/').pop();
    this.selectedVoice = {
      type: 'custom',
      id: 'custom',
      name: fileName,
      path: filePath
    };

    // Update selected voice info
    document.querySelector('#selected-voice-info .voice-name').textContent = `Custom: ${fileName}`;
    document.getElementById('preview-voice-btn').disabled = false;

    // Show reference text input for custom voice
    document.getElementById('custom-voice-ref-container').classList.remove('hidden');

    this.updateGenerateButtonState();
  }

  async previewSelectedVoice() {
    if (!this.selectedVoice) return;

    const previewBtn = document.getElementById('preview-voice-btn');

    if (this.previewAudio && !this.previewAudio.paused) {
      this.previewAudio.pause();
      this.previewAudio.currentTime = 0;
      return;
    }

    let audioPath;
    if (this.selectedVoice.type === 'preset') {
      // For preset voices, we'd have sample files bundled
      audioPath = `file://${await window.ecloAPI.getVoiceSamplePath(this.selectedVoice.id)}`;
    } else {
      audioPath = `file://${this.selectedVoice.path}`;
    }

    this.previewAudio = new Audio(audioPath);
    this.previewAudio.play().catch(err => {
      console.error('Preview failed:', err);
    });
  }

  getPresetReferenceText(voiceId) {
    const voice = this.presetVoices.find(v => v.id === voiceId);
    return voice ? voice.refText : null;
  }

  updateGenerateButtonState() {
    const caps = this.currentModelCapabilities;
    const requiresVoice = caps?.voiceCloning || caps?.presetVoices;
    const hasVoice = this.selectedVoice !== null;
    const hasText = document.getElementById('tts-text').value.trim().length > 0;

    // If model doesn't require voice, only check for text
    if (!requiresVoice) {
      document.getElementById('generate-btn').disabled = !hasText;
    } else {
      document.getElementById('generate-btn').disabled = !(hasVoice && hasText);
    }
  }

  setupEventListeners() {
    // Character count for TTS text
    const ttsText = document.getElementById('tts-text');
    const charCount = document.getElementById('char-count');
    ttsText.addEventListener('input', () => {
      charCount.textContent = ttsText.value.length;
      this.updateGenerateButtonState();
    });

    // Speed slider
    const ttsSpeed = document.getElementById('tts-speed');
    const speedValue = document.getElementById('speed-value');
    ttsSpeed.addEventListener('input', () => {
      speedValue.textContent = `${ttsSpeed.value}x`;
    });
  }

  // Navigation
  setupNavigationListeners() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        this.switchView(view);
      });
    });
  }

  switchView(viewName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update views - remove hidden and toggle active
    document.querySelectorAll('.view').forEach(view => {
      const isTarget = view.id === `${viewName}-view`;
      view.classList.remove('hidden');  // Remove hidden class first
      view.classList.toggle('active', isTarget);
      if (!isTarget) {
        view.style.display = 'none';
      } else {
        view.style.display = 'block';
      }
    });

    this.currentView = viewName;

    // Load history when switching to history view
    if (viewName === 'history') {
      this.loadHistory();
    }
  }

  // TTS
  setupTTSListeners() {
    const generateBtn = document.getElementById('generate-btn');
    generateBtn.addEventListener('click', () => this.generateTTS());

    // Play button
    document.getElementById('play-btn').addEventListener('click', () => {
      this.togglePlay(this.currentAudio, 'play-btn');
    });

    // Save button - opens file save dialog
    document.getElementById('save-btn').addEventListener('click', () => this.saveCurrentAudio());
  }

  async saveCurrentAudio() {
    if (!this.currentAudioPath) {
      alert('No audio to save');
      return;
    }

    const format = document.getElementById('save-format').value;
    const result = await window.ecloAPI.saveAudioFile(this.currentAudioPath, format);

    if (result.success) {
      alert(`Audio saved to: ${result.filePath}`);
    } else if (!result.canceled) {
      alert(`Save failed: ${result.error}`);
    }
  }

  async generateTTS() {
    const text = document.getElementById('tts-text').value.trim();
    if (!text) {
      alert('Please enter text to convert');
      return;
    }

    if (!this.selectedVoice) {
      alert('Please select a voice');
      return;
    }

    const language = document.getElementById('tts-language').value;
    const speed = parseFloat(document.getElementById('tts-speed').value);
    const style = document.getElementById('tts-style').value.trim();

    // Get voice sample path and reference text
    let voiceSamplePath;
    let referenceText = null;

    if (this.selectedVoice.type === 'preset') {
      voiceSamplePath = await window.ecloAPI.getVoiceSamplePath(this.selectedVoice.id);
      // Preset voices have built-in reference text (stored in config)
      referenceText = this.getPresetReferenceText(this.selectedVoice.id);
    } else {
      voiceSamplePath = this.selectedVoice.path;
      // Get custom voice reference text from input
      referenceText = document.getElementById('custom-ref-text').value.trim() || null;
    }

    // Show progress
    this.showProgress('progress-container', 'progress-fill', 'progress-text');

    try {
      const result = await window.ecloAPI.generateTTS({
        text,
        language,
        speed,
        voiceSamplePath,
        referenceText,
        instructText: style || null
      });

      if (result.success) {
        this.showAudioPlayer('audio-player', result.outputPath);
        this.currentAudioPath = result.outputPath;  // Store path for saving
        this.currentAudio = new Audio(`file://${result.outputPath}`);
        this.setupAudioEvents(this.currentAudio, 'current-time', 'total-time', 'play-btn');

        // Save to history
        await this.addToHistory({
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          language,
          voiceName: this.selectedVoice?.name || 'Custom',
          voiceId: this.selectedVoice?.id || 'custom',
          modelId: this.settings.ttsModel,
          duration: result.duration || 0,
          outputPath: result.outputPath
        });
      } else {
        alert(`Generation failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      this.hideProgress('progress-container');
    }
  }

  // Audio Player
  showAudioPlayer(playerId, filePath) {
    document.getElementById(playerId).classList.remove('hidden');
  }

  setupAudioEvents(audio, currentTimeId, totalTimeId, playBtnId) {
    audio.addEventListener('loadedmetadata', () => {
      document.getElementById(totalTimeId).textContent = this.formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      document.getElementById(currentTimeId).textContent = this.formatTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      this.updatePlayButton(playBtnId, false);
    });
  }

  togglePlay(audio, playBtnId) {
    if (!audio) return;

    if (audio.paused) {
      audio.play();
      this.updatePlayButton(playBtnId, true);
    } else {
      audio.pause();
      this.updatePlayButton(playBtnId, false);
    }
  }

  updatePlayButton(playBtnId, isPlaying) {
    const btn = document.getElementById(playBtnId);
    if (isPlaying) {
      btn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      `;
    } else {
      btn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Progress
  showProgress(containerId, fillId, textId) {
    const container = document.getElementById(containerId);
    container.classList.remove('hidden');

    // Set initial progress
    document.getElementById(fillId).style.width = '5%';
    document.getElementById(textId).textContent = 'Starting...';

    // Listen for progress updates from Python
    this.progressCleanup = window.ecloAPI.onProgress((progress) => {
      document.getElementById(fillId).style.width = `${progress.percent}%`;
      document.getElementById(textId).textContent = progress.message || 'Generating...';
    });
  }

  hideProgress(containerId) {
    const container = document.getElementById(containerId);
    // Complete the progress bar first
    const fillId = containerId.replace('container', 'fill');
    document.getElementById(fillId).style.width = '100%';

    // Cleanup progress listener
    if (this.progressCleanup) {
      this.progressCleanup();
      this.progressCleanup = null;
    }

    setTimeout(() => {
      container.classList.add('hidden');
      document.getElementById(fillId).style.width = '0%';
    }, 500);
  }

  // Settings
  setupSettingsListeners() {
    // Watermark
    document.getElementById('watermark-enabled').addEventListener('change', async (e) => {
      await window.ecloAPI.setSetting('watermarkEnabled', e.target.checked);
      this.settings.watermarkEnabled = e.target.checked;
    });

    // UI Language
    document.getElementById('ui-language').addEventListener('change', async (e) => {
      await window.ecloAPI.setSetting('uiLanguage', e.target.value);
      this.settings.uiLanguage = e.target.value;
    });

    // Custom model
    document.getElementById('apply-custom-model').addEventListener('click', async () => {
      const customPath = document.getElementById('custom-model-path').value.trim();
      if (customPath) {
        await this.selectModel(customPath);
      }
    });
  }

  // History Management
  async addToHistory(item) {
    try {
      await window.ecloAPI.addHistoryItem(item);
    } catch (error) {
      console.error('Failed to add to history:', error);
    }
  }

  async loadHistory() {
    try {
      const history = await window.ecloAPI.getHistory();
      this.renderHistory(history);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  renderHistory(history) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (!history || history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <h3>No generation history yet</h3>
          <p>Generated audio will appear here</p>
        </div>
      `;
      return;
    }

    historyList.innerHTML = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-info">
          <div class="history-item-text">${this.escapeHtml(item.text)}</div>
          <div class="history-item-meta">
            <span class="history-voice">${item.voiceName}</span>
            <span class="history-lang">${item.language.toUpperCase()}</span>
            <span class="history-duration">${item.duration ? this.formatTime(item.duration) : '--:--'}</span>
            <span class="history-date">${this.formatDate(item.timestamp)}</span>
          </div>
        </div>
        <div class="history-item-actions">
          <button class="icon-button history-play-btn" data-path="${item.outputPath}" title="Play">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          <button class="icon-button history-delete-btn" data-id="${item.id}" title="Delete">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    // Add event listeners
    historyList.querySelectorAll('.history-play-btn').forEach(btn => {
      btn.addEventListener('click', () => this.playHistoryItem(btn.dataset.path));
    });

    historyList.querySelectorAll('.history-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteHistoryItem(btn.dataset.id));
    });
  }

  async playHistoryItem(filePath) {
    if (this.historyAudio) {
      this.historyAudio.pause();
    }
    this.historyAudio = new Audio(`file://${filePath}`);
    this.historyAudio.play();
  }

  async deleteHistoryItem(id) {
    try {
      await window.ecloAPI.deleteHistoryItem(id);
      await this.loadHistory();
    } catch (error) {
      console.error('Failed to delete history item:', error);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.ecloApp = new EcloApp();
});
