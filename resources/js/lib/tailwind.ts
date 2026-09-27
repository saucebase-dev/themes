import colors from 'tailwindcss/colors';

export type PaletteFamily = {
    key: string;
    name: string;
    colors: { name: string; value: string }[];
};

const SHADES = [
    '50',
    '100',
    '200',
    '300',
    '400',
    '500',
    '600',
    '700',
    '800',
    '900',
    '950',
] as const;
const IGNORE = new Set(['current', 'inherit']);

/** Tailwind's default colors, grouped by family (`red-50` … `red-950`). */
export const TAILWIND_PALETTE: PaletteFamily[] = Object.entries(colors)
    .filter(([key]) => !IGNORE.has(key))
    .map(([key, value]) => {
        const name = key.charAt(0).toUpperCase() + key.slice(1);
        if (typeof value === 'string') {
            return { key, name, colors: [{ name: key, value }] };
        }
        const palette = value as Record<string, string>;
        return {
            key,
            name,
            colors: SHADES.filter((shade) => palette[shade]).map((shade) => ({
                name: `${key}-${shade}`,
                value: palette[shade],
            })),
        };
    })
    .filter((family) => family.colors.length > 0);

/** Families whose name or shade names match `query`; all of them when it's blank. */
export function filterPalette(query: string): PaletteFamily[] {
    const q = query.toLowerCase().trim();
    if (!q) return TAILWIND_PALETTE;

    return TAILWIND_PALETTE.map((family) => ({
        ...family,
        colors: family.colors.filter(
            (c) => c.name.includes(q) || family.name.toLowerCase().includes(q),
        ),
    })).filter((family) => family.colors.length > 0);
}
