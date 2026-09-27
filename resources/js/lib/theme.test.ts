import { describe, expect, it } from 'vitest';
import {
    computeRadiusScale,
    computeShadows,
    computeTrackingScale,
    isThemeVar,
    parseFontName,
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
