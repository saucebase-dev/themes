import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    computeRadiusScale,
    computeShadows,
    computeTrackingScale,
    isThemeVar,
    loadGoogleFont,
    parseFontName,
    swatchRadiusSm,
} from './theme';

describe('parseFontName', () => {
    it('takes the first family from a CSS font stack, unquoted', () => {
        expect(parseFontName('"DM Sans", ui-sans-serif, sans-serif')).toBe(
            'DM Sans',
        );
        expect(parseFontName("'Lora'")).toBe('Lora');
        expect(parseFontName('Inter')).toBe('Inter');
    });
});

describe('computeRadiusScale', () => {
    it('derives seven steps from one base radius', () => {
        expect(computeRadiusScale('0.5rem')).toEqual({
            '--radius-sm': 'calc(0.5rem - 4px)',
            '--radius-md': 'calc(0.5rem - 2px)',
            '--radius-lg': '0.5rem',
            '--radius-xl': 'calc(0.5rem + 4px)',
            '--radius-2xl': 'calc(0.5rem + 8px)',
            '--radius-3xl': 'calc(0.5rem + 16px)',
            '--radius-4xl': 'calc(0.5rem + 24px)',
        });
    });
});

describe('computeTrackingScale', () => {
    it('offsets six steps from the base letter spacing', () => {
        expect(computeTrackingScale(0)).toEqual({
            '--tracking-tighter': '-0.050em',
            '--tracking-tight': '-0.025em',
            '--tracking-normal': '0em',
            '--tracking-wide': '0.025em',
            '--tracking-wider': '0.050em',
            '--tracking-widest': '0.100em',
        });
    });
});

describe('computeShadows', () => {
    const shadows = computeShadows('black', 0.1, 3, 0, 0, 1);

    it('produces the full eight-step scale', () => {
        expect(Object.keys(shadows)).toEqual([
            '--shadow-2xs',
            '--shadow-xs',
            '--shadow-sm',
            '--shadow',
            '--shadow-md',
            '--shadow-lg',
            '--shadow-xl',
            '--shadow-2xl',
        ]);
    });

    it('builds single layers at scaled opacity', () => {
        expect(shadows['--shadow-2xs']).toBe(
            '0px 1px 3px 0px color-mix(in srgb, black 5.0%, transparent)',
        );
        expect(shadows['--shadow-2xl']).toBe(
            '0px 1px 3px 0px color-mix(in srgb, black 25.0%, transparent)',
        );
    });

    it('adds a tighter second layer to the middle sizes', () => {
        expect(shadows['--shadow-md']).toBe(
            '0px 1px 3px 0px color-mix(in srgb, black 10.0%, transparent), ' +
                '0px 2px 4px -1px color-mix(in srgb, black 10.0%, transparent)',
        );
        expect(shadows['--shadow']).toBe(shadows['--shadow-sm']);
    });
});

describe('isThemeVar', () => {
    it('owns the editable field vars and the scales computed from them', () => {
        expect(isThemeVar('--primary')).toBe(true);
        expect(isThemeVar('--font-sans')).toBe(true);
        expect(isThemeVar('--radius-xl')).toBe(true);
        expect(isThemeVar('--tracking-wide')).toBe(true);
        expect(isThemeVar('--shadow-md')).toBe(true);
        expect(isThemeVar('--shadow')).toBe(true);
    });

    it('leaves vars it does not own alone, such as the light/dark reveal', () => {
        expect(isThemeVar('--theme-reveal-x')).toBe(false);
        expect(isThemeVar('--theme-reveal-radius')).toBe(false);
        expect(isThemeVar('--some-app-var')).toBe(false);
    });
});

describe('swatchRadiusSm', () => {
    it('is a step below the theme radius, never negative', () => {
        expect(swatchRadiusSm('0.625rem')).toBe('0.5rem');
        expect(swatchRadiusSm('0.1rem')).toBe('0rem');
    });

    it('falls back to the page radius when the theme has none', () => {
        expect(swatchRadiusSm(undefined)).toBe('var(--radius-sm)');
    });
});

describe('loadGoogleFont', () => {
    afterEach(() => vi.unstubAllGlobals());

    function stubDocument(bundled: string[]) {
        const appended: { href: string }[] = [];
        vi.stubGlobal('document', {
            // The browser lists every @font-face the page's CSS declares here.
            fonts: bundled.map((family) => ({ family: `"${family}"` })),
            querySelector: () => null,
            createElement: () => ({}),
            head: {
                appendChild: (link: { href: string }) => appended.push(link),
            },
        });

        return appended;
    }

    it('skips a font the app already bundles', () => {
        const appended = stubDocument(['Outfit']);

        loadGoogleFont('Outfit');

        expect(appended).toEqual([]);
    });

    it('loads a font the app does not bundle from Google', () => {
        const appended = stubDocument(['Outfit']);

        loadGoogleFont('Lora');

        expect(appended).toHaveLength(1);
        expect(appended[0].href).toContain('family=Lora');
    });
});
