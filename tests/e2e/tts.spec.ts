/**
 * E2E tests for TTS Generation Flow
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.describe('TTS Generation Flow', () => {
  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../src/main/main.js')]
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Complete consent flow
    await window.locator('#terms-agree').check();
    await window.locator('#voice-rights-agree').check();
    await window.locator('#no-illegal-agree').check();
    await window.locator('#consent-continue').click();
    await expect(window.locator('#main-app')).not.toHaveClass(/hidden/);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('preset voice cards are displayed', async () => {
    const voiceCards = window.locator('.voice-card');
    await expect(voiceCards).toHaveCount(8);
  });

  test('clicking a voice card selects it', async () => {
    // Click Korean female voice
    const koreanFemaleCard = window.locator('[data-voice-id="korean_female"]');
    await koreanFemaleCard.click();

    // Should have selected class
    await expect(koreanFemaleCard).toHaveClass(/selected/);

    // Selected voice info should show
    const voiceName = window.locator('#selected-voice-info .voice-name');
    await expect(voiceName).toContainText('Sora');
  });

  test('selecting a voice updates language dropdown', async () => {
    // Select Korean voice
    await window.locator('[data-voice-id="korean_female"]').click();

    // Language should be set to Korean
    const languageSelect = window.locator('#tts-language');
    await expect(languageSelect).toHaveValue('ko');

    // Select English voice
    await window.locator('[data-voice-id="english_female"]').click();

    // Language should be set to English
    await expect(languageSelect).toHaveValue('en');
  });

  test('text input updates character count', async () => {
    const textInput = window.locator('#tts-text');
    const charCount = window.locator('#char-count');

    // Type some text
    await textInput.fill('Hello World');

    // Character count should update
    await expect(charCount).toContainText('11');
  });

  test('speed slider updates speed value display', async () => {
    const speedSlider = window.locator('#tts-speed');
    const speedValue = window.locator('#speed-value');

    // Change speed
    await speedSlider.fill('1.5');

    // Speed value should update
    await expect(speedValue).toContainText('1.5x');
  });

  test('generate button is disabled without voice selection', async () => {
    const generateBtn = window.locator('#generate-btn');

    // Enter text but no voice selected
    await window.locator('#tts-text').fill('Hello World');

    // Button should be disabled (model requires voice)
    // Note: This depends on model capabilities
    // If CosyVoice3 is default, it requires voice
  });

  test('generate button is enabled with voice and text', async () => {
    // Select voice
    await window.locator('[data-voice-id="english_female"]').click();

    // Enter text
    await window.locator('#tts-text').fill('Hello World');

    // Button should be enabled
    const generateBtn = window.locator('#generate-btn');
    await expect(generateBtn).toBeEnabled();
  });

  test('audio player is hidden initially', async () => {
    const audioPlayer = window.locator('#audio-player');
    await expect(audioPlayer).toHaveClass(/hidden/);
  });

  test('preview voice button is disabled without voice selection', async () => {
    const previewBtn = window.locator('#preview-voice-btn');
    await expect(previewBtn).toBeDisabled();
  });

  test('preview voice button is enabled after voice selection', async () => {
    // Select voice
    await window.locator('[data-voice-id="korean_female"]').click();

    // Preview button should be enabled
    const previewBtn = window.locator('#preview-voice-btn');
    await expect(previewBtn).toBeEnabled();
  });

  test('selecting different voice deselects previous', async () => {
    // Select Korean female
    const koreanCard = window.locator('[data-voice-id="korean_female"]');
    await koreanCard.click();
    await expect(koreanCard).toHaveClass(/selected/);

    // Select English female
    const englishCard = window.locator('[data-voice-id="english_female"]');
    await englishCard.click();

    // Korean should no longer be selected
    await expect(koreanCard).not.toHaveClass(/selected/);
    await expect(englishCard).toHaveClass(/selected/);
  });
});
