import { describe, expect, it } from 'vitest';
import type { FieldState } from '../types';
import { themeFields } from './fields';
import {
    fieldValueFromTheme,
    modeEdits,
    shadowArgs,
    sidebarInSync,
    themeSlug,
    themeToJson,
} from './panel';

/** Every field, empty, with the given values filled in. */
function fieldsWith(values: Record<string, string>): FieldState[] {
    return themeFields().map((f) => ({ ...f, value: values[f.key] ?? '' }));
}

const field = (key: string): FieldState =>
    fieldsWith({}).find((f) => f.key === key)!;

const base = {
    light: { '--primary': 'oklch(0.5 0.2 250)', '--shadow-color': '#000000' },
    dark: { '--primary': 'oklch(0.7 0.2 250)', '--shadow-color': '#ffffff' },
};

describe('themeSlug', () => {
    it('makes a lowercase, dash-separated id', () => {
        expect(themeSlug('My Brand  Theme!')).toBe('my-brand-theme');
        expect(themeSlug('  --Ocean 2--  ')).toBe('ocean-2');
    });
});

describe('themeToJson', () => {
    it('keeps the name as the title and slugs the id', () => {
        const json = themeToJson({
            fields: fieldsWith({}),
            synced: {},
            isDark: false,
            base,
            name: 'Ocean Blue',
        });

        expect(json.name).toBe('ocean-blue');
        expect(json.title).toBe('Ocean Blue');
        expect(json.description).toBe('');
    });

    it('writes an edited colour to the current mode and keeps the other mode from the base theme', () => {
        const { cssVars } = themeToJson({
            fields: fieldsWith({ primary: '#ff0000' }),
            synced: {},
            isDark: false,
            base,
            name: 'x',
        });

        expect(cssVars.light.primary).toBe('#ff0000');
        expect(cssVars.dark.primary).toBe('oklch(0.7 0.2 250)');
    });

    it('writes to dark when editing in dark mode', () => {
        const { cssVars } = themeToJson({
            fields: fieldsWith({ primary: '#ff0000' }),
            synced: {},
            isDark: true,
            base,
            name: 'x',
        });

        expect(cssVars.dark.primary).toBe('#ff0000');
        expect(cssVars.light.primary).toBe('oklch(0.5 0.2 250)');
    });

    it('writes a synced colour to both modes', () => {
        const { cssVars } = themeToJson({
            fields: fieldsWith({ primary: '#ff0000' }),
            synced: { primary: true },
            isDark: false,
            base,
            name: 'x',
        });

        expect(cssVars.light.primary).toBe('#ff0000');
        expect(cssVars.dark.primary).toBe('#ff0000');
    });

    it('writes units with their unit into the theme section, plus the computed scales', () => {
        const { cssVars } = themeToJson({
            fields: fieldsWith({ radius: '0.5', 'tracking-normal': '0' }),
            synced: {},
            isDark: false,
            base,
            name: 'x',
        });

        expect(cssVars.theme.radius).toBe('0.5rem');
        expect(cssVars.theme['radius-xl']).toBe('calc(0.5rem + 4px)');
        expect(cssVars.theme['tracking-normal']).toBe('0em');
        expect(cssVars.theme['tracking-wide']).toBe('0.025em');
    });

    it('writes a unitless per-mode value without inventing a unit', () => {
        const { cssVars } = themeToJson({
            fields: fieldsWith({ 'shadow-opacity': '0.2' }),
            synced: {},
            isDark: false,
            base,
            name: 'x',
        });

        expect(cssVars.light['shadow-opacity']).toBe('0.2');
        expect(cssVars.theme['shadow-opacity']).toBeUndefined();
    });

    it('writes a font as a quoted family with its generic fallback', () => {
        const { cssVars } = themeToJson({
            fields: fieldsWith({
                'font-sans': 'DM Sans',
                'font-mono': 'Fira Code',
            }),
            synced: {},
            isDark: false,
            base,
            name: 'x',
        });

        expect(cssVars.theme['font-sans']).toBe('"DM Sans", sans-serif');
        expect(cssVars.theme['font-mono']).toBe('"Fira Code", monospace');
    });

    it('stores light-mode shadow strings in the theme section', () => {
        const { cssVars } = themeToJson({
            fields: fieldsWith({
                'shadow-color': '#000000',
                'shadow-opacity': '0.1',
                'shadow-blur': '3',
                'shadow-spread': '0',
                'shadow-offset-y': '1',
            }),
            synced: {},
            isDark: false,
            base,
            name: 'x',
        });

        expect(cssVars.theme['shadow-2xs']).toBe(
            '0px 1px 3px 0px color-mix(in srgb, #000000 5.0%, transparent)',
        );
    });

    it('skips empty fields', () => {
        const { cssVars } = themeToJson({
            fields: fieldsWith({}),
            synced: {},
            isDark: false,
            base: null,
            name: 'x',
        });

        expect(cssVars.light).toEqual({});
        expect(cssVars.dark).toEqual({});
    });
});

describe('fieldValueFromTheme', () => {
    const theme = {
        light: {
            '--primary': '#111111',
            '--radius': '0.75rem',
            '--font-sans': '"Lora", serif',
        },
        dark: { '--primary': '#eeeeee' },
    };
    const noFallback = () => '';

    it('reads colours from the current mode', () => {
        expect(
            fieldValueFromTheme(field('primary'), theme, false, noFallback),
        ).toBe('#111111');
        expect(
            fieldValueFromTheme(field('primary'), theme, true, noFallback),
        ).toBe('#eeeeee');
    });

    it('reads non-colours from light and strips units and quotes', () => {
        expect(
            fieldValueFromTheme(field('radius'), theme, true, noFallback),
        ).toBe('0.75');
        expect(
            fieldValueFromTheme(field('font-sans'), theme, false, noFallback),
        ).toBe('Lora');
    });

    it('falls back to the stylesheet value when the theme does not define the var', () => {
        const fallback = (cssVar: string) =>
            cssVar === '--font-mono' ? 'Menlo, monospace' : '';

        expect(
            fieldValueFromTheme(field('font-mono'), theme, false, fallback),
        ).toBe('Menlo');
    });

    it('turns an unreadable unit into 0', () => {
        expect(
            fieldValueFromTheme(field('spacing'), theme, false, noFallback),
        ).toBe('0');
    });
});

describe('shadowArgs', () => {
    it('reads the six shadow inputs, with defaults for missing ones', () => {
        expect(
            shadowArgs(
                fieldsWith({ 'shadow-color': '#000', 'shadow-opacity': '0.3' }),
            ),
        ).toEqual(['#000', 0.3, 30, -10, 0, 1]);
    });

    it('is null without a shadow colour', () => {
        expect(shadowArgs(fieldsWith({}))).toBeNull();
    });
});

describe('modeEdits', () => {
    it('keeps only colours that differ from the theme', () => {
        const fields = fieldsWith({
            primary: '#ff0000',
            'shadow-color': '#000000',
            radius: '1',
        });

        expect(
            modeEdits(fields, {
                '--primary': '#0000ff',
                '--shadow-color': '#000000',
            }),
        ).toEqual({
            primary: '#ff0000',
        });
    });

    it('treats a colour the theme does not define as an edit', () => {
        expect(modeEdits(fieldsWith({ primary: '#ff0000' }), {})).toEqual({
            primary: '#ff0000',
        });
    });
});

describe('sidebarInSync', () => {
    const surfaces = {
        background: '#fff',
        foreground: '#000',
        primary: '#00f',
        'primary-foreground': '#fff',
        accent: '#eee',
        'accent-foreground': '#111',
        border: '#ddd',
        ring: '#00f',
    };
    const sidebar = {
        sidebar: '#fff',
        'sidebar-foreground': '#000',
        'sidebar-primary': '#00f',
        'sidebar-primary-foreground': '#fff',
        'sidebar-accent': '#eee',
        'sidebar-accent-foreground': '#111',
        'sidebar-border': '#ddd',
        'sidebar-ring': '#00f',
    };

    it('is true when every sidebar colour matches its surface colour', () => {
        expect(sidebarInSync(fieldsWith({ ...surfaces, ...sidebar }))).toBe(
            true,
        );
    });

    it('is false when one differs or is empty', () => {
        expect(
            sidebarInSync(
                fieldsWith({ ...surfaces, ...sidebar, 'sidebar-ring': '#f00' }),
            ),
        ).toBe(false);
        expect(sidebarInSync(fieldsWith({}))).toBe(false);
    });
});
