/**
 * E2E tests for Settings View
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.describe('Settings View', () => {
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

    // Navigate to Settings
    await window.locator('[data-view="settings"]').click();
    await expect(window.locator('#settings-view')).toHaveClass(/active/);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('model list is displayed', async () => {
    const modelList = window.locator('#model-list');
    await expect(modelList).toBeVisible();

    const modelCards = window.locator('.model-card');
    // Should have at least 3 models (CosyVoice3, OuteTTS, Kokoro)
    const count = await modelCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('a model is selected by default', async () => {
    const selectedModel = window.locator('.model-card.selected');
    await expect(selectedModel).toBeVisible();
  });

  test('clicking a model card selects it', async () => {
    // Get all model cards
    const modelCards = window.locator('.model-card');

    // Get the second model card (assuming first is already selected)
    const secondCard = modelCards.nth(1);
    await secondCard.click();

    // Second card should now be selected
    await expect(secondCard).toHaveClass(/selected/);
  });

  test('selecting different model updates current model display', async () => {
    const currentModelDisplay = window.locator('#current-model');
    const initialModel = await currentModelDisplay.textContent();

    // Find and click a different model
    const modelCards = window.locator('.model-card:not(.selected)');
    const otherModel = modelCards.first();
    await otherModel.click();

    // Current model display should change
    const newModel = await currentModelDisplay.textContent();
    expect(newModel).not.toBe(initialModel);
  });

  test('watermark toggle is present', async () => {
    const watermarkToggle = window.locator('#watermark-enabled');
    await expect(watermarkToggle).toBeVisible();
  });

  test('watermark toggle can be changed', async () => {
    const watermarkToggle = window.locator('#watermark-enabled');

    // Get initial state
    const initialChecked = await watermarkToggle.isChecked();

    // Toggle
    await watermarkToggle.click();

    // State should change
    const newChecked = await watermarkToggle.isChecked();
    expect(newChecked).toBe(!initialChecked);
  });

  test('UI language selector is present', async () => {
    const uiLanguageSelect = window.locator('#ui-language');
    await expect(uiLanguageSelect).toBeVisible();
  });

  test('UI language can be changed', async () => {
    const uiLanguageSelect = window.locator('#ui-language');

    // Change to English
    await uiLanguageSelect.selectOption('en');
    await expect(uiLanguageSelect).toHaveValue('en');

    // Change to Korean
    await uiLanguageSelect.selectOption('ko');
    await expect(uiLanguageSelect).toHaveValue('ko');
  });

  test('custom model input is present', async () => {
    const customModelInput = window.locator('#custom-model-path');
    await expect(customModelInput).toBeVisible();

    const applyButton = window.locator('#apply-custom-model');
    await expect(applyButton).toBeVisible();
  });

  test('model cards show capability badges', async () => {
    const capabilityBadges = window.locator('.capability-badge');
    const count = await capabilityBadges.count();
    expect(count).toBeGreaterThan(0);
  });
});
