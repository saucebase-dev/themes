import { expect, test } from '@e2e/fixtures';
import type { Page } from '@playwright/test';

const THEME_STORAGE_KEY = 'sb-theme-theme';

async function getCssVar(page: Page, varName: string): Promise<string> {
    return page.evaluate(
        (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(),
        varName,
    );
}

test.describe('Theme panel', () => {
    test.beforeEach(async ({ page, laravel }) => {
        await laravel.callFunction('Modules\\Themes\\Tests\\Support\\ThemesTestHelper::cleanUserThemes');
        await page.goto('/');
        await page.evaluate((key) => localStorage.removeItem(key), THEME_STORAGE_KEY);
        await page.reload();
    });

    test('opens and closes via trigger and close button', async ({ page }) => {
        await page.getByTestId('theme-panel-trigger').click();
        await expect(page.getByTestId('theme-picker-trigger')).toBeVisible();

        await page.getByTestId('theme-panel-close').click();
        await expect(page.getByTestId('theme-panel-trigger')).toBeVisible();
        await expect(page.getByTestId('theme-picker-trigger')).not.toBeVisible();
    });

    test('switches theme and persists selection in localStorage', async ({ page }) => {
        await page.getByTestId('theme-panel-trigger').click();
        await page.getByTestId('theme-picker-trigger').click();
        await page.getByTestId('theme-option-coffee').click();

        const stored = await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY);
        expect(stored).toBe('coffee');
    });

    test('selected theme persists after page reload', async ({ page }) => {
        await page.getByTestId('theme-panel-trigger').click();
        await page.getByTestId('theme-picker-trigger').click();
        await page.getByTestId('theme-option-coffee').click();

        await page.reload();

        await page.getByTestId('theme-panel-trigger').click();
        await expect(page.getByTestId('theme-picker-trigger')).toContainText('Coffee');
    });

    test('theme search filters the list', async ({ page }) => {
        await page.getByTestId('theme-panel-trigger').click();
        await page.getByTestId('theme-picker-trigger').click();

        await page.getByTestId('theme-search').fill('tang');

        await expect(page.getByTestId('theme-option-tangerine')).toBeVisible();
        await expect(page.getByTestId('theme-option-coffee')).not.toBeVisible();
    });

    test('reset button is disabled on default theme with no edits', async ({ page }) => {
        await page.getByTestId('theme-panel-trigger').click();
        await expect(page.getByTestId('theme-panel-reset')).toBeDisabled();
    });

    test('reset button is enabled after switching theme and resets to default', async ({ page }) => {
        await page.getByTestId('theme-panel-trigger').click();
        await page.getByTestId('theme-picker-trigger').click();
        await page.getByTestId('theme-option-coffee').click();

        await expect(page.getByTestId('theme-panel-reset')).not.toBeDisabled();

        await page.getByTestId('theme-panel-reset').click();
        await page.getByTestId('confirm-dialog-confirm').click();

        const stored = await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY);
        expect(stored).toBeNull();
    });

    test('save as creates a new theme and shows success toast', async ({ page }) => {
        await page.getByTestId('theme-panel-trigger').click();
        await page.getByTestId('theme-panel-save-as').click();

        await page.getByTestId('save-theme-name').fill('My E2E Theme');
        await page.getByTestId('save-theme-submit').click();

        await expect(page.getByTestId('theme-saved-toast')).toBeVisible();

        await page.getByTestId('theme-picker-trigger').click();
        await expect(page.getByTestId('theme-option-my-e2e-theme')).toBeVisible();
    });

    test('color input updates CSS custom property live', async ({ page }) => {
        await page.getByTestId('theme-panel-trigger').click();

        const before = await getCssVar(page, '--primary');

        const colorInput = page.getByTestId('color-input-primary');
        await colorInput.fill('#ff0000');
        await colorInput.press('Tab');

        const after = await getCssVar(page, '--primary');
        expect(after).not.toBe(before);
    });

    test('slider input updates CSS custom property live', async ({ page }) => {
        await page.getByTestId('theme-panel-trigger').click();

        const radiusInput = page.getByTestId('slider-input-radius');
        await radiusInput.fill('0.5');
        await radiusInput.press('Tab');

        const cssVar = await getCssVar(page, '--radius');
        expect(cssVar).toBe('0.5rem');
    });

    test('font picker updates CSS custom property live', async ({ page }) => {
        await page.getByTestId('theme-panel-trigger').click();

        await page.getByTestId('font-picker-font-sans').click();
        await page.getByTestId('font-option-inter').click();

        const cssVar = await getCssVar(page, '--font-sans');
        expect(cssVar.toLowerCase()).toContain('inter');
    });
});
