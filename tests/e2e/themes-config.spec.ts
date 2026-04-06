import { expect, test } from '@e2e/fixtures';

const THEME_STORAGE_KEY = 'sb-theme-theme';

test.describe('Themes config flags', () => {
    test.beforeEach(async ({ laravel }) => {
        await laravel.callFunction('Modules\\Themes\\Tests\\Support\\ThemesTestHelper::cleanUserThemes');
        // Restore defaults after any config overrides
        await laravel.callFunction('Modules\\Themes\\Tests\\Support\\ThemesTestHelper::resetConfig');
    });

    test.afterEach(async ({ laravel }) => {
        await laravel.callFunction('Modules\\Themes\\Tests\\Support\\ThemesTestHelper::cleanUserThemes');
        await laravel.callFunction('Modules\\Themes\\Tests\\Support\\ThemesTestHelper::resetConfig');
    });

    // ── themes.enabled ────────────────────────────────────────────────────────

    test('theme panel trigger is hidden when themes.enabled is false', async ({ page, laravel }) => {
        await laravel.callFunction('Modules\\Themes\\Tests\\Support\\ThemesTestHelper::setEnabled', [false]);
        await page.goto('/');

        await expect(page.getByTestId('theme-panel-trigger')).not.toBeVisible();
    });

    test('theme panel trigger is visible when themes.enabled is true', async ({ page, laravel }) => {
        await laravel.callFunction('Modules\\Themes\\Tests\\Support\\ThemesTestHelper::setEnabled', [true]);
        await page.goto('/');

        await expect(page.getByTestId('theme-panel-trigger')).toBeVisible();
    });

    // ── themes.allow_editing ─────────────────────────────────────────────────

    test('save button is absent for bundled themes when allow_editing is enabled', async ({ page, laravel }) => {
        await laravel.callFunction('Modules\\Themes\\Tests\\Support\\ThemesTestHelper::setAllowEditing', [true]);
        await page.goto('/');
        await page.evaluate((key) => localStorage.removeItem(key), THEME_STORAGE_KEY);
        await page.reload();

        await page.getByTestId('theme-panel-trigger').click();

        // Default (bundled) theme is selected — Save button should NOT appear
        await expect(page.getByTestId('theme-panel-save')).not.toBeVisible();
    });

    test('save button appears for user-created theme when allow_editing is enabled', async ({ page, laravel }) => {
        await laravel.callFunction('Modules\\Themes\\Tests\\Support\\ThemesTestHelper::setAllowEditing', [true]);
        await page.goto('/');
        await page.evaluate((key) => localStorage.removeItem(key), THEME_STORAGE_KEY);
        await page.reload();

        // Create a user theme via Save As
        await page.getByTestId('theme-panel-trigger').click();
        await page.getByTestId('theme-panel-save-as').click();
        await page.getByTestId('save-theme-name').fill('My E2E Editable');
        await page.getByTestId('save-theme-submit').click();

        // Select the new user theme
        await page.getByTestId('theme-picker-trigger').click();
        await page.getByTestId('theme-option-my-e2e-editable').click();

        // Save button should now be visible
        await expect(page.getByTestId('theme-panel-save')).toBeVisible();
    });

    test('save button is absent when allow_editing is disabled', async ({ page, laravel }) => {
        await laravel.callFunction('Modules\\Themes\\Tests\\Support\\ThemesTestHelper::setAllowEditing', [false]);
        await page.goto('/');

        await page.getByTestId('theme-panel-trigger').click();

        await expect(page.getByTestId('theme-panel-save')).not.toBeVisible();
    });
});
