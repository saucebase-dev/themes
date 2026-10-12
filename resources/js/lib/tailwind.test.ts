import { describe, expect, it } from 'vitest';
import { filterPalette, TAILWIND_PALETTE } from './tailwind';

describe('TAILWIND_PALETTE', () => {
    it('lists each family with its shades, skipping keywords', () => {
        const red = TAILWIND_PALETTE.find((f) => f.key === 'red');
        expect(red?.name).toBe('Red');
        expect(red?.colors[0].name).toBe('red-50');
        expect(red?.colors).toHaveLength(11);
        expect(TAILWIND_PALETTE.some((f) => f.key === 'current')).toBe(false);
        expect(TAILWIND_PALETTE.some((f) => f.key === 'inherit')).toBe(false);
    });
});

describe('filterPalette', () => {
    it('returns everything for an empty query', () => {
        expect(filterPalette('  ')).toBe(TAILWIND_PALETTE);
    });

    it('matches shade names and whole families, case-insensitively', () => {
        expect(filterPalette('RED-5').map((f) => f.key)).toEqual(['red']);
        expect(filterPalette('red-5')[0].colors.map((c) => c.name)).toEqual([
            'red-50',
            'red-500',
        ]);
        expect(filterPalette('Sky')[0].colors).toHaveLength(11);
    });
});
