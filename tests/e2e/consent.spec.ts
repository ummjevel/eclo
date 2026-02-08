/**
 * E2E tests for Consent Flow
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.describe('Consent Modal Flow', () => {
  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../src/main/main.js')]
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('shows consent modal on first launch', async () => {
    // Consent modal should be visible
    const consentModal = window.locator('#consent-modal');
    await expect(consentModal).toBeVisible();

    // Main app should be hidden
    const mainApp = window.locator('#main-app');
    await expect(mainApp).toHaveClass(/hidden/);
  });

  test('continue button is disabled initially', async () => {
    const continueBtn = window.locator('#consent-continue');
    await expect(continueBtn).toBeDisabled();
  });

  test('continue button remains disabled with partial checkbox selection', async () => {
    const continueBtn = window.locator('#consent-continue');

    // Check only first checkbox
    await window.locator('#terms-agree').check();
    await expect(continueBtn).toBeDisabled();

    // Check second checkbox
    await window.locator('#voice-rights-agree').check();
    await expect(continueBtn).toBeDisabled();
  });

  test('continue button enables when all checkboxes are checked', async () => {
    const continueBtn = window.locator('#consent-continue');

    // Check all checkboxes
    await window.locator('#terms-agree').check();
    await window.locator('#voice-rights-agree').check();
    await window.locator('#no-illegal-agree').check();

    // Button should now be enabled
    await expect(continueBtn).toBeEnabled();
  });

  test('clicking continue hides modal and shows main app', async () => {
    // Check all checkboxes
    await window.locator('#terms-agree').check();
    await window.locator('#voice-rights-agree').check();
    await window.locator('#no-illegal-agree').check();

    // Click continue
    await window.locator('#consent-continue').click();

    // Modal should be hidden
    const consentModal = window.locator('#consent-modal');
    await expect(consentModal).toHaveClass(/hidden/);

    // Main app should be visible
    const mainApp = window.locator('#main-app');
    await expect(mainApp).not.toHaveClass(/hidden/);
  });

  test('unchecking a checkbox disables continue button again', async () => {
    const continueBtn = window.locator('#consent-continue');

    // Check all
    await window.locator('#terms-agree').check();
    await window.locator('#voice-rights-agree').check();
    await window.locator('#no-illegal-agree').check();
    await expect(continueBtn).toBeEnabled();

    // Uncheck one
    await window.locator('#terms-agree').uncheck();
    await expect(continueBtn).toBeDisabled();
  });
});
