/**
 * E2E tests for View Navigation
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.describe('View Navigation', () => {
  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../src/main/main.js')]
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Complete consent flow first
    await window.locator('#terms-agree').check();
    await window.locator('#voice-rights-agree').check();
    await window.locator('#no-illegal-agree').check();
    await window.locator('#consent-continue').click();

    // Wait for main app to be visible
    await expect(window.locator('#main-app')).not.toHaveClass(/hidden/);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('TTS view is shown by default', async () => {
    const ttsView = window.locator('#tts-view');
    await expect(ttsView).toHaveClass(/active/);

    const historyView = window.locator('#history-view');
    await expect(historyView).not.toHaveClass(/active/);

    const settingsView = window.locator('#settings-view');
    await expect(settingsView).not.toHaveClass(/active/);
  });

  test('TTS nav item is active by default', async () => {
    const ttsNav = window.locator('[data-view="tts"]');
    await expect(ttsNav).toHaveClass(/active/);
  });

  test('can navigate to History view', async () => {
    // Click History nav
    await window.locator('[data-view="history"]').click();

    // History view should be active
    const historyView = window.locator('#history-view');
    await expect(historyView).toHaveClass(/active/);

    // History nav should be active
    const historyNav = window.locator('[data-view="history"]');
    await expect(historyNav).toHaveClass(/active/);

    // TTS view should not be active
    const ttsView = window.locator('#tts-view');
    await expect(ttsView).not.toHaveClass(/active/);
  });

  test('can navigate to Settings view', async () => {
    // Click Settings nav
    await window.locator('[data-view="settings"]').click();

    // Settings view should be active
    const settingsView = window.locator('#settings-view');
    await expect(settingsView).toHaveClass(/active/);

    // Settings nav should be active
    const settingsNav = window.locator('[data-view="settings"]');
    await expect(settingsNav).toHaveClass(/active/);
  });

  test('can navigate back to TTS view from Settings', async () => {
    // Go to Settings
    await window.locator('[data-view="settings"]').click();
    await expect(window.locator('#settings-view')).toHaveClass(/active/);

    // Go back to TTS
    await window.locator('[data-view="tts"]').click();
    await expect(window.locator('#tts-view')).toHaveClass(/active/);
    await expect(window.locator('#settings-view')).not.toHaveClass(/active/);
  });

  test('navigating between all views works correctly', async () => {
    // TTS -> History
    await window.locator('[data-view="history"]').click();
    await expect(window.locator('#history-view')).toHaveClass(/active/);

    // History -> Settings
    await window.locator('[data-view="settings"]').click();
    await expect(window.locator('#settings-view')).toHaveClass(/active/);
    await expect(window.locator('#history-view')).not.toHaveClass(/active/);

    // Settings -> TTS
    await window.locator('[data-view="tts"]').click();
    await expect(window.locator('#tts-view')).toHaveClass(/active/);
    await expect(window.locator('#settings-view')).not.toHaveClass(/active/);
  });
});
