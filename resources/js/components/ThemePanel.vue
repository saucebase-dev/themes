<script setup lang="ts">
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

import IconChevronDown from '~icons/lucide/chevron-down';
import IconPalette from '~icons/lucide/palette';
import IconRotateCcw from '~icons/lucide/rotate-ccw';
import IconSave from '~icons/lucide/save';
import IconTerminal from '~icons/lucide/terminal';
import IconX from '~icons/lucide/x';

import ThemeSelector from '@/components/ThemeSelector.vue';
import { computed, reactive, ref, watch } from 'vue';
import type { FieldState, Font, Theme } from '../types';

import { useDialog } from '@/composables/useDialog';
import { useHttp, usePage } from '@inertiajs/vue3';
import { useDark } from '@vueuse/core';
import { trans } from 'laravel-vue-i18n';
import ColorInput from './ColorInput.vue';
import DialogCommand from './DialogCommand.vue';
import DialogSave from './DialogSave.vue';
import FontPicker from './FontPicker.vue';
import SliderInput from './SliderInput.vue';
import SyncToggle from './SyncToggle.vue';
import ThemePicker from './ThemePicker.vue';

import {
    THEME_STORAGE_KEY,
    applyFieldToDom,
    applyThemeVars,
    clearThemeOverrides,
    parseFontName,
} from '../utils/theme';

import { FIELD_DEFS } from '../fields';

// ── Page props ────────────────────────────────────────────────────────────────

const page = usePage();
const http = useHttp({
    name: '',
    title: '',
    description: '',
    cssVars: {
        theme: {} as Record<string, string>,
        light: {} as Record<string, string>,
        dark: {} as Record<string, string>,
    },
});
const isDark = useDark();
const { confirm } = useDialog();

const themesEnabled = computed(() => page.props?.themes != null);
const allowEditing = computed(() => page.props?.themes?.allow_editing === true);

const themes = computed<Theme[]>(() => page.props?.themes?.items ?? []);
const fontOptions = computed<Record<string, Font[]>>(() => ({
    'font-sans':  page.props?.themes?.fonts?.sans  ?? [],
    'font-serif': page.props?.themes?.fonts?.serif ?? [],
    'font-mono':  page.props?.themes?.fonts?.mono  ?? [],
}));

// ── Theme selection ───────────────────────────────────────────────────────────

const defaultThemeId = computed(() => themes.value[0]?.id ?? 'default');

const selectedThemeId = ref<string>(
    localStorage?.getItem(THEME_STORAGE_KEY) ?? defaultThemeId.value,
);

const currentTheme = computed<Theme | null>(
    () =>
        themes.value.find((t) => t.id === selectedThemeId.value) ??
        themes.value[0] ??
        null,
);

function isDefault(id: string): boolean {
    return id === '' || id === 'default' || id === defaultThemeId.value;
}

function setTheme(id: string): void {
    selectedThemeId.value = id;
    if (isDefault(id)) {
        localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
        localStorage.setItem(THEME_STORAGE_KEY, id);
    }
}

async function selectTheme(id: string): Promise<void> {
    if (id === selectedThemeId.value) {
        return;
    }

    clearThemeOverrides();

    if (
        !document.startViewTransition ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
        setTheme(id);
        return;
    }

    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
    );

    const ripple = document.createElement('div');
    ripple.style.cssText = `position:fixed;border-radius:50%;pointer-events:none;z-index:99998;left:${x}px;top:${y}px;width:0;height:0;transform:translate(-50%,-50%);background:color-mix(in oklch,var(--foreground) 25%,transparent);filter:blur(40px)`;
    document.body.appendChild(ripple);
    const diameter = endRadius * 2;
    ripple.animate(
        [
            { width: '0', height: '0', opacity: '0.7' },
            { width: `${diameter}px`, height: `${diameter}px`, opacity: '0' },
        ],
        { duration: 600, easing: 'ease-out' },
    ).onfinish = () => ripple.remove();

    const target = themes.value.find((t) => t.id === id) ?? null;
    applyThemeVars(target, document.documentElement.classList.contains('dark'));

    setTheme(id);

    document.documentElement.animate(
        {
            clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
        },
        {
            duration: 800,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)',
        },
    );
}

// ── Fields with values ────────────────────────────────────────────────────────

const fields = reactive<FieldState[]>(
    FIELD_DEFS.map((f) => ({ ...f, value: '' })),
);

const uniqueGroups = FIELD_DEFS.filter((f) => f.group)
    .map((f) => f.group!)
    .filter((g, i, arr) => arr.findIndex((x) => x.name === g.name) === i);

const groupOpen = reactive<Record<string, boolean>>(
    Object.fromEntries(
        uniqueGroups.map((g) => [g.name, !(g.collapsed ?? false)]),
    ),
);

// Per-group cross-mode sync: when on, color changes apply to both light and dark
const groupModeSynced = reactive<Record<string, boolean>>(
    Object.fromEntries(uniqueGroups.map((g) => [g.name, false])),
);

// Cache of synced color values — survives dark/light mode switches
const modeSyncCache = reactive<Record<string, string>>({});

// Snapshot of field values as loaded from the theme — used to detect live edits.
const originalValues = ref<Record<string, string>>({});

function getCssVar(cssVar: string): string {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement)
        .getPropertyValue(cssVar)
        .trim();
}

function populateFieldsFromTheme(theme: Theme): void {
    for (const field of fields) {
        // Non-color fields (font, unit) are mode-agnostic — always read from light
        const sourceVars =
            field.type === 'color'
                ? isDark.value
                    ? theme.dark
                    : theme.light
                : theme.light;
        // Fall back to the computed CSS value (stylesheet default) when the theme
        // JSON doesn't define the var (e.g. --font-serif on the default theme).
        const raw = sourceVars[field.vars[0]] || getCssVar(field.vars[0]);
        if (field.type === 'font') {
            field.value = parseFontName(raw);
        } else if (field.type === 'unit') {
            // SliderInput expects a plain number string — strip the CSS unit
            field.value = String(parseFloat(raw) || 0);
        } else {
            field.value = raw;
        }
    }
    // Apply sidebar sync now so originalValues captures the synced state,
    // preventing a false "live edits" indicator on fresh load.
    if (sidebarSynced.value) applySidebarSync();
    originalValues.value = Object.fromEntries(
        fields.map((f) => [f.key, f.value]),
    );
}

// Re-apply full theme whenever dark/light mode switches, then restore any
// live non-color edits (radius, font) — they are mode-agnostic and should
// persist across dark/light switches.
watch(isDark, (dark) => {
    applyThemeVars(currentTheme.value, dark);
    for (const field of fields) {
        if (field.type !== 'color' && field.value !== '') {
            applyFieldToDom(field, String(field.value));
        }
        // Restore cached value for cross-mode synced groups.
        // Must also call applyFieldToDom directly — if field.value hasn't changed
        // Vue won't re-trigger the per-field watcher, leaving the DOM on the new
        // mode's theme colors from applyThemeVars above.
        if (
            field.group &&
            groupModeSynced[field.group.name] &&
            modeSyncCache[field.key] !== undefined
        ) {
            field.value = modeSyncCache[field.key];
            applyFieldToDom(field, modeSyncCache[field.key]);
        }
    }
});

// Populate field values from the active theme whenever it changes.
// Also triggers a full re-apply so the DOM is in sync after a theme switch.
watch(
    currentTheme,
    (theme) => {
        if (!theme) {
            return;
        }
        applyThemeVars(theme, isDark.value);
        populateFieldsFromTheme(theme);
    },
    { immediate: true },
);

// Apply each field value to the DOM whenever it changes (live preview).
// immediate: true ensures the initial value set by the theme watch is also applied.
for (const field of fields) {
    watch(
        () => field.value,
        (value) => {
            if (value !== '' && value !== undefined && value !== null) {
                applyFieldToDom(field, String(value));
                // Mirror to cache when cross-mode sync is on for this group
                if (field.group && groupModeSynced[field.group.name]) {
                    modeSyncCache[field.key] = String(value);
                }
            }
        },
        { immediate: true },
    );
}

// ── Computed state ────────────────────────────────────────────────────────────

const hasLiveEdits = computed(() =>
    fields.some((f) => f.value !== originalValues.value[f.key]),
);

const canReset = computed(
    () => !isDefault(selectedThemeId.value) || hasLiveEdits.value,
);

const canSave = computed(
    () => allowEditing.value && (currentTheme.value?.editable ?? false),
);

// ── Reset ─────────────────────────────────────────────────────────────────────

async function reset(): Promise<void> {
    const ok = await confirm({
        title: trans('Reset theme'),
        description: trans(
            'All changes will be lost and the theme will return to its defaults.',
        ),
        confirmLabel: trans('Reset'),
        cancelLabel: trans('Cancel'),
        variant: 'destructive',
        icon: IconRotateCcw,
        align: 'left',
    });
    if (!ok) {
        return;
    }
    clearThemeOverrides();
    if (isDefault(selectedThemeId.value)) {
        // Already on the default theme — currentTheme won't change so the watcher
        // won't fire. Repopulate fields and re-apply manually.
        const theme = currentTheme.value;
        if (theme) {
            applyThemeVars(theme, isDark.value);
            populateFieldsFromTheme(theme);
        }
    } else {
        setTheme(defaultThemeId.value);
        // watch(currentTheme) fires and handles applyThemeVars + populateFieldsFromTheme
    }
}

// ── Save (overwrite existing user theme) ─────────────────────────────────────

async function save(): Promise<void> {
    const theme = currentTheme.value;
    if (!theme?.editable) return;

    const payload = toJson(theme.name);
    http.name = payload.name;
    http.title = payload.title;
    http.description = payload.description;
    http.cssVars = payload.cssVars;

    await http.put(route('themes.update', { name: theme.id }));
}

// ── Save as JSON ──────────────────────────────────────────────────────────────

function toJson(inputName: string) {
    const theme: Record<string, string> = {};
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};

    // Strip '--' prefix for shadcn format
    const stripPrefix = (v: string) => (v.startsWith('--') ? v.slice(2) : v);

    for (const field of fields) {
        if (
            field.value === '' ||
            field.value === null ||
            field.value === undefined
        )
            continue;

        if (field.type === 'color') {
            const isSynced = field.group && groupModeSynced[field.group.name];
            if (isSynced) {
                // Cross-mode sync: write current value to both modes
                for (const target of [light, dark]) {
                    for (const v of field.vars) {
                        target[stripPrefix(v)] = field.value;
                    }
                }
            } else {
                // Current mode: write the user's (possibly edited) value
                const currentTarget = isDark.value ? dark : light;
                for (const v of field.vars) {
                    currentTarget[stripPrefix(v)] = field.value;
                }

                // Other mode: preserve the base theme's untouched value
                const otherTarget = isDark.value ? light : dark;
                const otherSource = isDark.value
                    ? currentTheme.value?.light
                    : currentTheme.value?.dark;
                for (const v of field.vars) {
                    const val = otherSource?.[v];
                    if (val) otherTarget[stripPrefix(v)] = val;
                }
            }
        } else if (field.type === 'unit') {
            // Unit fields (radius, spacing) are mode-agnostic — write to theme section
            const unit = field.props?.unit ?? 'rem';
            const valueWithUnit = `${field.value}${unit}`;
            for (const v of field.vars) {
                theme[stripPrefix(v)] = valueWithUnit;
            }
        } else if (field.type === 'font') {
            // Font fields are mode-agnostic — write to theme section
            const fallback = field.vars[0]?.includes('mono')
                ? 'monospace'
                : field.vars[0]?.includes('serif')
                  ? 'serif'
                  : 'sans-serif';
            const cssValue = `"${field.value}", ${fallback}`;
            for (const v of field.vars) {
                theme[stripPrefix(v)] = cssValue;
            }
        }
    }

    const name = inputName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    return {
        name,
        title: inputName,
        description: '',
        cssVars: { theme, light, dark },
    };
}

// When cross-mode sync is toggled on: snapshot current values into cache.
// When toggled off: clear the cache for that group.
watch(
    groupModeSynced,
    (map) => {
        for (const [groupName, synced] of Object.entries(map)) {
            if (synced) {
                for (const field of fields) {
                    if (field.group?.name === groupName && field.value !== '') {
                        modeSyncCache[field.key] = field.value;
                    }
                }
            } else {
                for (const field of fields) {
                    if (field.group?.name === groupName) {
                        delete modeSyncCache[field.key];
                    }
                }
            }
        }
    },
    { deep: true },
);

// ── Sidebar sync ─────────────────────────────────────────────────────────────

const SIDEBAR_SYNC_MAP: [string, string][] = [
    ['sidebar', 'background'],
    ['sidebar-foreground', 'foreground'],
    ['sidebar-primary', 'primary'],
    ['sidebar-primary-foreground', 'primary-foreground'],
    ['sidebar-accent', 'accent'],
    ['sidebar-accent-foreground', 'accent-foreground'],
    ['sidebar-border', 'border'],
    ['sidebar-ring', 'ring'],
];

const sidebarSynced = ref(true);

function applySidebarSync(): void {
    for (const [sidebarKey, sourceKey] of SIDEBAR_SYNC_MAP) {
        const source = fields.find((f) => f.key === sourceKey);
        const target = fields.find((f) => f.key === sidebarKey);
        if (source && target) target.value = source.value;
    }
}

// Apply sync immediately when toggled on
watch(sidebarSynced, (synced) => {
    if (synced) applySidebarSync();
});

// Re-sync automatically whenever a source field changes while sync is on
watch(
    () =>
        SIDEBAR_SYNC_MAP.map(
            ([, sourceKey]) => fields.find((f) => f.key === sourceKey)?.value,
        ),
    () => {
        if (sidebarSynced.value) applySidebarSync();
    },
);

// ── Sections (group COLORS fields into a card, standalone otherwise) ──────────

type StandaloneSection = { type: 'standalone'; field: FieldState };
type GroupSection = {
    type: 'group';
    name: string;
    description?: string;
    collapsed?: boolean;
    syncable?: boolean;
    fields: FieldState[];
};

const sections = computed(() => {
    const result: (StandaloneSection | GroupSection)[] = [];
    const groupMap = new Map<string, GroupSection>();

    for (const field of fields) {
        if (field.group) {
            if (!groupMap.has(field.group.name)) {
                const section: GroupSection = {
                    type: 'group',
                    name: field.group.name,
                    description: field.group.description,
                    collapsed: field.group.collapsed,
                    syncable: field.group.syncable,
                    fields: [],
                };
                groupMap.set(field.group.name, section);
                result.push(section);
            }
            groupMap.get(field.group.name)!.fields.push(field);
        } else {
            result.push({ type: 'standalone', field });
        }
    }

    return result;
});

// ── Panel open state ──────────────────────────────────────────────────────────

const sheetOpen = ref(false);
const dialogSaveOpen = ref(false);
const dialogCommandOpen = ref(false);
</script>

<template>
    <template v-if="themesEnabled">
        <!-- Floating trigger — hidden while panel is open -->
        <Teleport to="body">
            <div
                v-if="!sheetOpen"
                class="gradient-border-spin fixed top-[calc(50%-1.5rem)] right-3 z-50 rounded-xl p-0.5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
            >
                <button
                    data-testid="theme-panel-trigger"
                    :aria-label="$t('Toggle color theme panel')"
                    class="text-foreground focus-visible:ring-ring relative flex size-12 cursor-pointer items-center justify-center rounded-xl bg-white/40 backdrop-blur-sm transition-colors hover:bg-white/60 focus-visible:ring-2 focus-visible:outline-none dark:bg-gray-900/40 dark:hover:bg-gray-900/60"
                    @click="sheetOpen = true"
                >
                    <IconPalette class="size-6 shrink-0" />
                    <span
                        v-if="canReset"
                        class="text-destructive/50 bg-destructive absolute -top-0.5 right-0.5 flex size-2 items-center justify-center rounded-lg shadow-lg ring-2"
                    />
                </button>
            </div>
        </Teleport>

        <!-- Sheet — DialogPortal inside SheetContent handles its own teleport to body -->
        <Sheet v-model:open="sheetOpen">
            <SheetContent
                side="right"
                class="flex flex-col gap-0 p-0 shadow-2xl sm:w-110 sm:max-w-none [&>button:last-child]:hidden"
                overlay-class="bg-black/5 blur-sm"
            >
                <TooltipProvider>
                <SheetTitle class="sr-only">
                    {{ $t('Theme customizer') }}
                </SheetTitle>
                <SheetDescription class="sr-only">
                    {{ $t('Adjust colors, font, and radius.') }}
                </SheetDescription>

                <!-- Header -->
                <div
                    class="border-border flex items-center gap-3 border-b px-4 py-3"
                >
                    <IconPalette
                        class="text-muted-foreground size-5 shrink-0"
                    />
                    <div class="min-w-0 flex-1">
                        <p
                            class="text-foreground text-sm leading-none font-semibold"
                        >
                            {{ $t('Theme customizer') }}
                        </p>
                        <p class="text-muted-foreground mt-0.5 text-xs">
                            {{ $t('Adjust colors, font, and radius.') }}
                        </p>
                    </div>
                    <ThemeSelector inline hide-device />
                    <button
                        data-testid="theme-panel-close"
                        class="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        :aria-label="$t('Close theme panel')"
                        @click="sheetOpen = false"
                    >
                        <IconX class="size-4" />
                    </button>
                </div>

                <!-- Content -->
                <div class="flex-1 space-y-4 overflow-y-auto p-3 pb-12">
                    <!-- Theme picker -->
                    <ThemePicker
                        :options="themes"
                        :model-value="selectedThemeId"
                        @update:model-value="selectTheme"
                    />

                    <!-- Config-driven fields -->
                    <template
                        v-for="section in sections"
                        :key="
                            section.type === 'group'
                                ? section.name
                                : section.field.key
                        "
                    >
                        <!-- Grouped fields — collapsible card -->
                        <div
                            v-if="section.type === 'group'"
                            class="border-border rounded-lg border shadow-sm"
                        >
                            <Collapsible v-model:open="groupOpen[section.name]">
                                <CollapsibleTrigger as-child>
                                    <button
                                        class="focus-visible:ring-ring flex w-full cursor-pointer items-center justify-between px-4 py-3 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                                        :class="
                                            groupOpen[section.name]
                                                ? 'border-border border-b'
                                                : 'rounded-lg'
                                        "
                                    >
                                        <span
                                            class="text-foreground text-xs font-bold tracking-wider uppercase"
                                            >{{ $t(section.name) }}</span
                                        >
                                        <div class="flex items-center gap-2">
                                            <SyncToggle
                                                v-if="
                                                    section.name === 'Sidebar'
                                                "
                                                v-model="sidebarSynced"
                                                :tooltip="
                                                    $t(
                                                        'Sync sidebar colors with main theme',
                                                    )
                                                "
                                                :tooltip-active="
                                                    $t(
                                                        'Sidebar is synced with main theme colors — click to disable',
                                                    )
                                                "
                                            />
                                            <SyncToggle
                                                v-if="section.syncable"
                                                v-model="
                                                    groupModeSynced[
                                                        section.name
                                                    ]
                                                "
                                                :tooltip="
                                                    $t(
                                                        'Sync colors across light and dark modes',
                                                    )
                                                "
                                                :tooltip-active="
                                                    $t(
                                                        'Colors are synced across modes — click to disable',
                                                    )
                                                "
                                            />
                                            <IconChevronDown
                                                class="text-muted-foreground size-4 shrink-0 transition-transform duration-200"
                                                :class="{
                                                    '-rotate-90':
                                                        !groupOpen[
                                                            section.name
                                                        ],
                                                }"
                                            />
                                        </div>
                                    </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div class="space-y-2 p-2">
                                        <template
                                            v-for="field in section.fields"
                                            :key="field.key"
                                        >
                                            <div
                                                v-if="field.type === 'font'"
                                                class="space-y-1.5"
                                            >
                                                <p
                                                    class="text-muted-foreground px-0.5 text-xs font-medium"
                                                >
                                                    {{ $t(field.label) }}
                                                </p>
                                                <FontPicker
                                                    :fonts="
                                                        fontOptions[
                                                            field.key
                                                        ] ?? []
                                                    "
                                                    :test-id="`font-picker-${field.key}`"
                                                    v-model="field.value"
                                                />
                                            </div>
                                            <SliderInput
                                                v-else-if="
                                                    field.type === 'unit'
                                                "
                                                :label="$t(field.label)"
                                                :test-id="`slider-input-${field.key}`"
                                                v-model="field.value"
                                                v-bind="field.props"
                                            />
                                            <ColorInput
                                                v-else
                                                :label="$t(field.label)"
                                                :test-id="`color-input-${field.key}`"
                                                v-model="field.value"
                                            />
                                        </template>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        <!-- Standalone field -->
                        <template v-else>
                            <!-- Font field -->
                            <FontPicker
                                v-if="section.field.type === 'font'"
                                :fonts="fontOptions[section.field.key] ?? []"
                                :test-id="`font-picker-${section.field.key}`"
                                v-model="section.field.value"
                            />

                            <!-- Unit field (slider) -->
                            <SliderInput
                                v-if="section.field.type === 'unit'"
                                :label="section.field.label"
                                :test-id="`slider-input-${section.field.key}`"
                                v-model="section.field.value"
                                v-bind="section.field.props"
                            />
                        </template>
                    </template>
                </div>

                <!-- Footer -->
                <div class="border-border bg-background/20 border-t p-3">
                    <div class="flex gap-2">
                            <button
                                data-testid="theme-panel-reset"
                                :disabled="!canReset"
                                class="border-border hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                @click="reset"
                            >
                                <IconRotateCcw class="size-4" />
                                {{ $t('Reset') }}
                            </button>
                            <button
                                v-if="canSave"
                                data-testid="theme-panel-save"
                                class="border-border hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                @click="save"
                            >
                                <IconSave class="size-4" />
                                {{ $t('Save') }}
                            </button>
                            <button
                                data-testid="theme-panel-save-as"
                                class="border-border hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                @click="dialogSaveOpen = true"
                            >
                                <IconSave class="size-4" />
                                {{ $t('Save as') }}
                            </button>
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <button
                                        data-testid="theme-panel-command"
                                        :disabled="isDefault(selectedThemeId)"
                                        class="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex items-center justify-center rounded-lg border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        @click="dialogCommandOpen = true"
                                    >
                                        <IconTerminal class="size-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {{ $t('How to use this theme') }}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                </div>
                </TooltipProvider>
            </SheetContent>
        </Sheet>

        <DialogCommand
            v-model="dialogCommandOpen"
            :theme-id="selectedThemeId"
        />
        <DialogSave
            v-model="dialogSaveOpen"
            :to-json="toJson"
            :on-theme-saved="selectTheme"
        />
    </template>
</template>
