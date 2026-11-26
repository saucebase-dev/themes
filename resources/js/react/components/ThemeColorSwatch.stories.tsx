import preview from '@/.storybook/preview';
import { expect } from 'storybook/test';
import ThemeColorSwatch from './ThemeColorSwatch';

/**
 * A theme at a glance: its background, primary and secondary colours, and text. The
 * corners follow the theme's radius. Theme pickers show one per theme.
 */
const meta = preview.meta({
    title: 'Themes/ThemeColorSwatch',
    component: ThemeColorSwatch,
    args: {
        preview: {
            background: '#ffffff',
            primary: '#4f46e5',
            secondary: '#f1f5f9',
            foreground: '#0f172a',
        },
        radius: '0.625rem',
    },
});
export default meta;

/** A light theme with rounded corners. */
export const Default = meta.story({
    play: async ({ canvas }) => {
        await expect(canvas.getByText('A')).toBeVisible();
        await expect(canvas.getByText('a')).toBeVisible();
        // A swatch is as wide as its four marks, wherever it is placed.
        const swatch = canvas.getByText('A').parentElement!;
        await expect(swatch.getBoundingClientRect().width).toBeLessThan(40);
    },
});

/** A dark theme. */
export const Dark = meta.story({
    args: {
        preview: {
            background: '#0f172a',
            primary: '#f59e0b',
            secondary: '#1e293b',
            foreground: '#f8fafc',
        },
    },
});

/** A theme with square corners. */
export const Square = meta.story({ args: { radius: '0rem' } });

/** Without colours of its own: the current theme's. */
export const CurrentTheme = meta.story({
    args: { preview: {}, radius: undefined },
    play: async ({ canvas }) => {
        const swatch = canvas.getByText('A').parentElement!;
        await expect(getComputedStyle(swatch).backgroundColor).not.toBe(
            'rgba(0, 0, 0, 0)',
        );
    },
});
