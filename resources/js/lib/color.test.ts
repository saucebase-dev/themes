import { describe, expect, it } from 'vitest';
import {
    clamp,
    colorToHsv,
    hexToRgb,
    hsvToRgb,
    nudgeColorArea,
    rgbToHex,
    rgbToHsv,
    swatchBackground,
} from './color';

describe('hexToRgb', () => {
    it('reads six-digit hex, with or without #', () => {
        expect(hexToRgb('#6366f1')).toEqual({ r: 99, g: 102, b: 241 });
        expect(hexToRgb('6366f1')).toEqual({ r: 99, g: 102, b: 241 });
    });

    it('expands three-digit shorthand', () => {
        expect(hexToRgb('#fa0')).toEqual({ r: 255, g: 170, b: 0 });
    });

    it('treats unreadable channels as 0', () => {
        expect(hexToRgb('#zzzzzz')).toEqual({ r: 0, g: 0, b: 0 });
    });
});

describe('rgbToHex', () => {
    it('pads each channel to two digits', () => {
        expect(rgbToHex(0, 10, 255)).toBe('#000aff');
    });

    it('rounds and clamps out-of-range channels', () => {
        expect(rgbToHex(-20, 127.6, 300)).toBe('#0080ff');
    });
});

describe('rgbToHsv / hsvToRgb', () => {
    it('converts primaries', () => {
        expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 100, v: 100 });
        expect(rgbToHsv(0, 0, 255)).toEqual({ h: 240, s: 100, v: 100 });
    });

    it('gives greys no saturation', () => {
        expect(rgbToHsv(128, 128, 128).s).toBe(0);
        expect(rgbToHsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 });
    });

    it('round-trips a colour through HSV', () => {
        const { h, s, v } = rgbToHsv(99, 102, 241);
        const { r, g, b } = hsvToRgb(h, s, v);

        // Hue is rounded to a whole degree, so allow one step per channel.
        expect(Math.abs(r - 99)).toBeLessThanOrEqual(1);
        expect(Math.abs(g - 102)).toBeLessThanOrEqual(1);
        expect(Math.abs(b - 241)).toBeLessThanOrEqual(1);
    });

    it('wraps hue 360 back to red', () => {
        expect(hsvToRgb(360, 100, 100)).toEqual({ r: 255, g: 0, b: 0 });
    });
});

describe('clamp', () => {
    it('keeps a value within bounds', () => {
        expect(clamp(-1, 0, 255)).toBe(0);
        expect(clamp(300, 0, 255)).toBe(255);
        expect(clamp(42, 0, 255)).toBe(42);
    });
});

describe('colorToHsv', () => {
    it('reads hex colors', () => {
        expect(colorToHsv('#ff0000')).toEqual({ h: 0, s: 100, v: 100 });
    });
});

describe('swatchBackground', () => {
    it('layers the color over a checkerboard, so transparency shows', () => {
        expect(swatchBackground('#ff000080')).toBe(
            'linear-gradient(#ff000080, #ff000080), repeating-conic-gradient(#aaa 0% 25%, white 0% 50%) 0 0 / 8px 8px',
        );
    });
});

describe('nudgeColorArea', () => {
    it('moves saturation with left and right, brightness with up and down', () => {
        expect(nudgeColorArea(50, 50, 'ArrowRight')).toEqual({ s: 51, v: 50 });
        expect(nudgeColorArea(50, 50, 'ArrowLeft')).toEqual({ s: 49, v: 50 });
        expect(nudgeColorArea(50, 50, 'ArrowUp')).toEqual({ s: 50, v: 51 });
        expect(nudgeColorArea(50, 50, 'ArrowDown')).toEqual({ s: 50, v: 49 });
    });

    it('takes a bigger step when asked', () => {
        expect(nudgeColorArea(50, 50, 'ArrowRight', true)).toEqual({
            s: 60,
            v: 50,
        });
    });

    it('stops at the edges', () => {
        expect(nudgeColorArea(100, 0, 'ArrowRight')).toEqual({ s: 100, v: 0 });
        expect(nudgeColorArea(100, 0, 'ArrowDown')).toEqual({ s: 100, v: 0 });
    });

    it('ignores every other key', () => {
        expect(nudgeColorArea(50, 50, 'Tab')).toBeNull();
    });
});
