/** Framework-neutral colour conversions shared by both stacks' pickers. */

export function hexToRgb(hex: string) {
    const clean = hex.replace('#', '');
    const full =
        clean.length === 3
            ? clean
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : clean;
    return {
        r: parseInt(full.slice(0, 2), 16) || 0,
        g: parseInt(full.slice(2, 4), 16) || 0,
        b: parseInt(full.slice(4, 6), 16) || 0,
    };
}

export function rgbToHex(r: number, g: number, b: number): string {
    return (
        '#' +
        [r, g, b]
            .map((v) =>
                Math.round(Math.min(255, Math.max(0, v)))
                    .toString(16)
                    .padStart(2, '0'),
            )
            .join('')
    );
}

export function rgbToHsv(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === r) {
            h = ((g - b) / d) % 6;
        } else if (max === g) {
            h = (b - r) / d + 2;
        } else {
            h = (r - g) / d + 4;
        }
        h = h * 60;
        if (h < 0) {
            h += 360;
        }
    }
    return {
        h: Math.round(h),
        s: max === 0 ? 0 : (d / max) * 100,
        v: max * 100,
    };
}

export function hsvToRgb(h: number, s: number, v: number) {
    s /= 100;
    v /= 100;
    const i = Math.floor(h / 60) % 6;
    const f = h / 60 - Math.floor(h / 60);
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0,
        g = 0,
        b = 0;
    switch (i) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
            r = v;
            g = p;
            b = q;
            break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
}

/** Convert any valid CSS color string to #rrggbb by drawing it on a 1×1 canvas. */
export function cssColorToHex(color: string): string {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return rgbToHex(r, g, b);
}

/** Black or white, whichever reads better on top of `color`. */
export function contrastingIconColor(color: string): string {
    if (!color) return '#ffffff';
    const { r, g, b } = hexToRgb(cssColorToHex(color));
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000000' : '#ffffff';
}

export function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}
