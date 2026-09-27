/**
 * The theme editor's logic, kept apart from any UI framework so both stacks share it.
 * Everything here is pure: fields in, values out. DOM writes stay in theme.ts.
 */
import type { FieldState } from '../types';
import {
    computeRadiusScale,
    computeShadows,
    computeTrackingScale,
    fontFallback,
    parseFontName,
} from './theme';

/** CSS vars keyed with their `--` prefix, as a theme's light/dark maps hold them. */
export type ThemeVars = Record<string, string>;

export type ThemePayload = {
    name: string;
    title: string;
    description: string;
    cssVars: {
        theme: Record<string, string>;
        light: Record<string, string>;
        dark: Record<string, string>;
    };
};

/** Sidebar colours and the surface colour each one mirrors when linked. */
export const SIDEBAR_SYNC_MAP: [string, string][] = [
    ['sidebar', 'background'],
    ['sidebar-foreground', 'foreground'],
    ['sidebar-primary', 'primary'],
    ['sidebar-primary-foreground', 'primary-foreground'],
    ['sidebar-accent', 'accent'],
    ['sidebar-accent-foreground', 'accent-foreground'],
    ['sidebar-border', 'border'],
    ['sidebar-ring', 'ring'],
];

const stripPrefix = (cssVar: string): string =>
    cssVar.startsWith('--') ? cssVar.slice(2) : cssVar;

const valueOf = (fields: FieldState[], key: string): string | undefined =>
    fields.find((f) => f.key === key)?.value;

/** The file-safe id a theme is saved under. */
export function themeSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * The value a field shows for a theme. Colours come from the current mode; everything
 * else is mode-agnostic and comes from light. `fallback` supplies the stylesheet value
 * when the theme leaves a var undefined.
 */
export function fieldValueFromTheme(
    field: FieldState,
    theme: { light: ThemeVars; dark: ThemeVars },
    isDark: boolean,
    fallback: (cssVar: string) => string,
): string {
    const source = field.type === 'color' && isDark ? theme.dark : theme.light;
    const raw = source[field.vars[0]] || fallback(field.vars[0]);

    if (field.type === 'font') {
        return parseFontName(raw);
    }
    if (field.type === 'unit') {
        // The slider takes a plain number; the unit is added back on save.
        return String(Number.parseFloat(raw) || 0);
    }
    return raw;
}

/** Arguments for computeShadows() from the shadow fields, or null without a colour. */
export function shadowArgs(
    fields: FieldState[],
): Parameters<typeof computeShadows> | null {
    const color = valueOf(fields, 'shadow-color');
    if (!color) {
        return null;
    }
    const num = (key: string, fallback: string) =>
        Number.parseFloat(valueOf(fields, key) || fallback);

    return [
        color,
        num('shadow-opacity', '0.2'),
        num('shadow-blur', '30'),
        num('shadow-spread', '-10'),
        num('shadow-offset-x', '0'),
        num('shadow-offset-y', '1'),
    ];
}

/** Colour edits worth keeping when leaving a mode: values that differ from the theme. */
export function modeEdits(
    fields: FieldState[],
    themeVars: ThemeVars,
): Record<string, string> {
    const edits: Record<string, string> = {};
    for (const field of fields) {
        if (field.type !== 'color' || field.value === '') continue;
        const themeValue = themeVars[field.vars[0]];
        if (themeValue === undefined || field.value !== themeValue) {
            edits[field.key] = field.value;
        }
    }
    return edits;
}

/** Whether every sidebar colour already equals the surface colour it mirrors. */
export function sidebarInSync(fields: FieldState[]): boolean {
    return SIDEBAR_SYNC_MAP.every(([sidebarKey, sourceKey]) => {
        const sidebar = valueOf(fields, sidebarKey);
        const source = valueOf(fields, sourceKey);
        return !!sidebar && !!source && sidebar === source;
    });
}

/**
 * The editor's state as a theme file. Edited per-mode values go to the current mode
 * (or both when linked), the other mode keeps the base theme's value, mode-agnostic
 * values go to `theme` with their unit, and the computed radius, tracking and
 * light-mode shadow scales are added so the CLI can bake them without JavaScript.
 */
export function themeToJson(input: {
    fields: FieldState[];
    synced: Record<string, boolean>;
    isDark: boolean;
    base: { light?: ThemeVars; dark?: ThemeVars } | null;
    name: string;
}): ThemePayload {
    const { fields, synced, isDark, base, name } = input;
    const theme: Record<string, string> = {};
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};

    const current = isDark ? dark : light;
    const other = isDark ? light : dark;
    const otherSource = (isDark ? base?.light : base?.dark) ?? {};

    const writePerMode = (field: FieldState, value: string) => {
        for (const cssVar of field.vars) {
            if (synced[field.key]) {
                light[stripPrefix(cssVar)] = value;
                dark[stripPrefix(cssVar)] = value;
                continue;
            }
            current[stripPrefix(cssVar)] = value;
            const kept = otherSource[cssVar];
            if (kept) other[stripPrefix(cssVar)] = kept;
        }
    };
    const writeTheme = (field: FieldState, value: string) => {
        for (const cssVar of field.vars) theme[stripPrefix(cssVar)] = value;
    };

    for (const field of fields) {
        if (!field.value) continue;

        if (field.type === 'color') {
            writePerMode(field, field.value);
        } else if (field.type === 'unit') {
            const value = `${field.value}${field.props?.unit ?? ''}`;
            if (field.perMode) writePerMode(field, value);
            else writeTheme(field, value);
        } else if (field.type === 'font') {
            writeTheme(
                field,
                `"${field.value}", ${fontFallback(field.vars[0])}`,
            );
        } else {
            writeTheme(field, field.value);
        }
    }

    const scales: Record<string, string>[] = [];
    if (theme.radius) scales.push(computeRadiusScale(theme.radius));
    const tracking = valueOf(fields, 'tracking-normal');
    if (tracking)
        scales.push(computeTrackingScale(Number.parseFloat(tracking)));

    const shadowColor =
        light['shadow-color'] ?? base?.light?.['--shadow-color'];
    if (shadowColor) {
        scales.push(
            computeShadows(
                shadowColor,
                Number.parseFloat(
                    light['shadow-opacity'] ??
                        base?.light?.['--shadow-opacity'] ??
                        '0.2',
                ),
                Number.parseFloat(theme['shadow-blur'] ?? '30'),
                Number.parseFloat(theme['shadow-spread'] ?? '-10'),
                Number.parseFloat(theme['shadow-offset-x'] ?? '0'),
                Number.parseFloat(theme['shadow-offset-y'] ?? '1'),
            ),
        );
    }
    for (const scale of scales) {
        for (const [cssVar, value] of Object.entries(scale)) {
            theme[stripPrefix(cssVar)] = value;
        }
    }

    return {
        name: themeSlug(name),
        title: name,
        description: '',
        cssVars: { theme, light, dark },
    };
}
