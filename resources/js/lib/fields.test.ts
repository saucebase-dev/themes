import { describe, expect, it } from 'vitest';
import { themeFields } from './fields';

describe('themeFields', () => {
    const fields = themeFields();

    it('gives every field a unique key and at least one CSS var', () => {
        const keys = fields.map((f) => f.key);

        expect(new Set(keys).size).toBe(keys.length);
        for (const field of fields) {
            expect(field.vars.length, field.key).toBeGreaterThan(0);
            for (const cssVar of field.vars) {
                expect(cssVar, field.key).toMatch(/^--/);
            }
        }
    });

    it('marks only shadow opacity as a per-mode unit', () => {
        expect(fields.filter((f) => f.perMode).map((f) => f.key)).toEqual([
            'shadow-opacity',
        ]);
    });

    it('translates labels and group names with the translator it is given', () => {
        const translated = themeFields((key) => `t:${key}`);

        for (const field of translated) {
            expect(field.label, field.key).toMatch(/^t:/);
            if (field.group) {
                expect(field.group.name, field.key).toMatch(/^t:/);
            }
        }
    });
});
