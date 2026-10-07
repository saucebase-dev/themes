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
import IconPaintbrush from '~icons/lucide/paintbrush';
import IconPalette from '~icons/lucide/palette';
import IconRotateCcw from '~icons/lucide/rotate-ccw';
import IconSave from '~icons/lucide/save';
import IconTrash from '~icons/lucide/trash-2';
import IconTerminal from '~icons/lucide/terminal';
import IconX from '~icons/lucide/x';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ThemeSelector from '@/components/ThemeSelector.vue';
import {
    isRevealing,
    revealTransition,
    type RevealOrigin,
} from '@js/lib/themeReveal';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { FieldState, Font, Theme } from '../../types';

import { useDialog } from '@/composables/useDialog';
import { router, useHttp, usePage } from '@inertiajs/vue3';
import { httpFailureHandlers } from '@js/lib/http';
import { useColorMode } from '@vueuse/core';
import { trans } from 'laravel-vue-i18n';
import { toast } from 'vue-sonner';
import ColorInput from './ColorInput.vue';
import DialogCommand from './DialogCommand.vue';
import DialogSave from './DialogSave.vue';
import FontPicker from './FontPicker.vue';
import SliderInput from './SliderInput.vue';
import LinkToggle from './LinkToggle.vue';
import ThemePicker from './ThemePicker.vue';

import {
    THEME_STORAGE_KEY,
    applyFieldToDom,
    applyThemeVars,
    clearThemeOverrides,
    computeShadows,
    readCssVar,
    setProperty,
} from '../../lib/theme';

import { themeFields } from '../../lib/fields';
import {
    fieldValueFromTheme,
    isPerMode,
    modeEdits,
    shadowArgs,
    SIDEBAR_SYNC_MAP,
    sidebarInSync,
    themeToJson,
} from '../../lib/panel';

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
// `onError` covers 422s only; these say the rest.
const failure = httpFailureHandlers((message) => toast.error(trans(message)));
const colorMode = useColorMode({ storageKey: 'appearance' });
const isDark = computed(() => colorMode.value === 'dark');
const { confirm, isOpen: isConfirming } = useDialog();

const themesEnabled = computed(() => page.props?.themes != null);
const canSave = computed(() => page.props?.themes?.canSave === true);
const canApply = computed(() => page.props?.themes?.canApply === true);

const themes = computed<Theme[]>(() => page.props?.themes?.items ?? []);
const fontOptions = computed<Record<string, Font[]>>(() => ({
    'font-sans': page.props?.themes?.fonts?.sans ?? [],
    'font-serif': page.props?.themes?.fonts?.serif ?? [],
    'font-mono': page.props?.themes?.fonts?.mono ?? [],
}));

// ── Theme selection ───────────────────────────────────────────────────────────

const defaultThemeId = computed(() => themes.value[0]?.id ?? 'default');

const selectedThemeId = ref<string>(
    (typeof localStorage !== 'undefined'
        ? localStorage.getItem(THEME_STORAGE_KEY)
        : null) ?? defaultThemeId.value,
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

/** Switch themes with the same circle reveal as the light/dark switcher. */
async function selectTheme(
    id: string,
    origin: RevealOrigin | null = null,
): Promise<void> {
    if (id === selectedThemeId.value) {
        return;
    }

    const target = themes.value.find((t) => t.id === id) ?? null;

    await revealTransition(origin, async () => {
        applyThemeVars(target, isDark.value);
        setTheme(id);
        await nextTick();
    });
}

/**
 * Clicks that are not really "outside" the panel: during a reveal the transition
 * layer sits above everything, so a click lands on <html>; and a confirm dialog
 * opened from the panel sits outside it.
 */
function keepOpenWhileRevealing(event: Event): void {
    if (isRevealing() || isConfirming.value) {
        event.preventDefault();
    }
}

// ── Fields with values ────────────────────────────────────────────────────────

const fields = reactive<FieldState[]>(
    themeFields(trans).map((f) => ({ ...f, value: '' })),
);

const uniqueGroups = themeFields(trans)
    .filter((f) => f.group)
    .map((f) => f.group!)
    .filter((g, i, arr) => arr.findIndex((x) => x.name === g.name) === i);

const groupOpen = reactive<Record<string, boolean>>(
    Object.fromEntries(
        uniqueGroups.map((g) => [g.name, !(g.collapsed ?? false)]),
    ),
);

// Per-field cross-mode sync: when on, changes to that field apply to both light and dark
const fieldSynced = reactive<Record<string, boolean>>({});

// Cache of synced color values — survives dark/light mode switches
const modeSyncCache = reactive<Record<string, string>>({});

// Per-mode cache for color edits — persists user edits across mode switches
const modeColorEdits = reactive<
    Record<'light' | 'dark', Record<string, string>>
>({
    light: {},
    dark: {},
});

// Snapshot of field values as loaded from the theme — used to detect live edits.
const originalValues = ref<Record<string, string>>({});

function populateFieldsFromTheme(theme: Theme): void {
    for (const field of fields) {
        field.value = fieldValueFromTheme(
            field,
            theme,
            isDark.value,
            readCssVar,
        );
    }
    // Detect the sidebar's link state from the loaded values; never force it, or
    // sidebar colours would be overwritten with the surface colours on load.
    const allSidebarSynced = sidebarInSync(fields);
    for (const f of fields) {
        if (f.key.startsWith('sidebar') && f.type === 'color')
            fieldSynced[f.key] = allSidebarSynced;
    }
    originalValues.value = Object.fromEntries(
        fields.map((f) => [f.key, f.value]),
    );
}

// Re-apply full theme whenever dark/light mode switches, then restore any
// live non-color edits (radius, font) — they are mode-agnostic and should
// persist across dark/light switches.
watch(isDark, (dark) => {
    const leavingMode = dark ? 'light' : 'dark';
    const enteringMode = dark ? 'dark' : 'light';

    // The theme's canonical values for the mode being left.
    const leavingThemeVars =
        (dark ? currentTheme.value?.light : currentTheme.value?.dark) ?? {};

    // Keep only genuine edits for the leaving mode. Saving every value would pollute
    // the cache when the panel starts in dark mode (values already hold dark colours).
    modeColorEdits[leavingMode] = modeEdits(fields, leavingThemeVars);

    applyThemeVars(currentTheme.value, dark);

    for (const field of fields) {
        // Mode-agnostic fields — always re-apply.
        if (!isPerMode(field) && field.value !== '') {
            applyFieldToDom(field, String(field.value));
        }

        // Cross-mode synced fields take precedence over per-mode edits.
        if (fieldSynced[field.key] && modeSyncCache[field.key] !== undefined) {
            field.value = modeSyncCache[field.key];
            applyFieldToDom(field, modeSyncCache[field.key]);
            continue;
        }

        if (isPerMode(field)) {
            const savedEdit = modeColorEdits[enteringMode][field.key];
            if (savedEdit !== undefined) {
                // Restore the user's live edit for this mode.
                field.value = savedEdit;
                applyFieldToDom(field, savedEdit);
            } else if (currentTheme.value) {
                // No user edit — show the entering mode's own value.
                const themeDefault = fieldValueFromTheme(
                    field,
                    currentTheme.value,
                    dark,
                    readCssVar,
                );
                if (field.value !== themeDefault) {
                    field.value = themeDefault;
                }
            }
        }
    }

    // Shadow composite vars (--shadow-md etc.) were cleared by applyThemeVars().
    // They are not in MANAGED_VARS_SET so they won't be re-set unless we call this.
    applyShadowVars();
});

// Populate field values when the selected theme ID changes.
// Watching the ID (a primitive) instead of the full object prevents Inertia
// prop refreshes from triggering a repopulate — which would wipe unsaved edits.
watch(
    () => currentTheme.value?.id,
    (id, prevId) => {
        const theme = currentTheme.value;
        if (!theme) {
            return;
        }
        // Clear per-mode edit caches only when actually switching themes,
        // not on initial load (prevId === undefined handled by immediate: true).
        if (prevId !== undefined) {
            modeColorEdits.light = {};
            modeColorEdits.dark = {};
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
                // Mirror to cache when cross-mode sync is on for this field
                if (fieldSynced[field.key]) {
                    modeSyncCache[field.key] = String(value);
                }
            }
        },
        { immediate: true },
    );
}

// ── Shadow computed vars ──────────────────────────────────────────────────────

function applyShadowVars(): void {
    const args = shadowArgs(fields);
    if (!args) return;

    for (const [key, value] of Object.entries(computeShadows(...args))) {
        setProperty(key, value);
    }
}

// Re-compute whenever any shadow component var changes.
watch(
    () => [
        fields.find((f) => f.key === 'shadow-color')?.value,
        fields.find((f) => f.key === 'shadow-opacity')?.value,
        fields.find((f) => f.key === 'shadow-blur')?.value,
        fields.find((f) => f.key === 'shadow-spread')?.value,
        fields.find((f) => f.key === 'shadow-offset-x')?.value,
        fields.find((f) => f.key === 'shadow-offset-y')?.value,
    ],
    () => applyShadowVars(),
    { immediate: true },
);

// ── Computed state ────────────────────────────────────────────────────────────

const hasLiveEdits = computed(() =>
    fields.some((f) => f.value !== originalValues.value[f.key]),
);

const canReset = computed(
    () => !isDefault(selectedThemeId.value) || hasLiveEdits.value,
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

    modeColorEdits.light = {};
    modeColorEdits.dark = {};

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

    await http
        .put(route('themes.update', { name: theme.id }), {
            onSuccess() {
                originalValues.value = Object.fromEntries(
                    fields.map((f) => [f.key, f.value]),
                );
                toast.success(trans('Theme updated successfully'), {
                    testId: 'theme-updated-toast',
                });
            },
            onError() {
                toast.error(trans('Failed to update theme'));
            },
            ...failure,
        })
        .catch(() => {});
}

// ── Delete (saved presets only) ──────────────────────────────────────────────

async function remove(): Promise<void> {
    const theme = currentTheme.value;
    if (!theme?.editable) return;

    const ok = await confirm({
        title: trans('Delete theme'),
        description: trans('This saved theme will be deleted permanently.'),
        confirmLabel: trans('Delete'),
        cancelLabel: trans('Cancel'),
        variant: 'destructive',
        icon: IconTrash,
    });
    if (!ok) return;

    await http
        .delete(route('themes.destroy', { name: theme.id }), {
            onSuccess() {
                selectTheme(defaultThemeId.value);
                router.reload({ only: ['themes'] });
                toast.success(trans('Theme deleted'), {
                    testId: 'theme-deleted-toast',
                });
            },
            onError() {
                toast.error(trans('Failed to delete theme'));
            },
            ...failure,
        })
        .catch(() => {});
}

// ── Set as default (local only) ──────────────────────────────────────────────

async function apply(): Promise<void> {
    const ok = await confirm({
        title: trans('Set as default'),
        description: trans(
            'Everyone will see this theme by default. Commit the change to keep it.',
        ),
        confirmLabel: trans('Set as default'),
        cancelLabel: trans('Cancel'),
        icon: IconPaintbrush,
    });
    if (!ok) return;

    http.cssVars = toJson(currentTheme.value?.name ?? '').cssVars;

    await http
        .post(route('themes.apply'), {
            onSuccess() {
                // Default now holds these values; show it as the current theme.
                router.reload({
                    only: ['themes'],
                    onSuccess: () => {
                        originalValues.value = Object.fromEntries(
                            fields.map((f) => [f.key, f.value]),
                        );
                        selectTheme(defaultThemeId.value);
                        toast.success(trans('Theme set as default'), {
                            testId: 'theme-default-set-toast',
                        });
                    },
                });
            },
            onError() {
                toast.error(trans('Failed to set theme as default'));
            },
            ...failure,
        })
        .catch(() => {});
}

// ── Save as JSON ──────────────────────────────────────────────────────────────

function toJson(inputName: string) {
    return themeToJson({
        fields,
        synced: fieldSynced,
        isDark: isDark.value,
        base: currentTheme.value,
        name: inputName,
        otherModeEdits: modeColorEdits[isDark.value ? 'light' : 'dark'],
    });
}

// When per-field sync is toggled on: snapshot current value into cache.
// When toggled off: clear the cache for that field.
watch(
    fieldSynced,
    (map) => {
        for (const [fieldKey, synced] of Object.entries(map)) {
            const field = fields.find((f) => f.key === fieldKey);
            if (!field) continue;
            if (synced && field.value !== '') {
                modeSyncCache[fieldKey] = field.value;
            } else {
                delete modeSyncCache[fieldKey];
            }
        }
    },
    { deep: true },
);

// ── Sidebar sync ─────────────────────────────────────────────────────────────

const sidebarSynced = ref<boolean | null>(false);

function applySidebarSync(): void {
    for (const [sidebarKey, sourceKey] of SIDEBAR_SYNC_MAP) {
        const source = fields.find((f) => f.key === sourceKey);
        const target = fields.find((f) => f.key === sidebarKey);
        if (source && target) target.value = source.value;
    }
}

// Apply sync immediately when toggled on; lock/unlock all sidebar children across modes
watch(sidebarSynced, (synced) => {
    if (synced === null) return;
    if (synced) applySidebarSync();
    for (const field of fields) {
        if (field.key.startsWith('sidebar') && field.type === 'color') {
            fieldSynced[field.key] = synced;
        }
    }
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

// ── Group-level field sync ────────────────────────────────────────────────────

// Source of truth for group-level cross-mode sync state (syncable groups only)
const groupFieldSync = reactive<Record<string, boolean | null>>(
    Object.fromEntries(
        uniqueGroups.filter((g) => g.syncable).map((g) => [g.name, false]),
    ),
);

// groupFieldSync → propagate to children fieldSynced (one watcher per group key)
for (const groupName of Object.keys(groupFieldSync)) {
    watch(
        () => groupFieldSync[groupName],
        (syncValue) => {
            if (syncValue === null) return;
            const section = sections.value.find(
                (s) => s.type === 'group' && s.name === groupName,
            );
            if (!section || section.type !== 'group') return;
            for (const field of section.fields) {
                if (field.type === 'color') fieldSynced[field.key] = syncValue;
            }
        },
    );
}

// fieldSynced → reflect mixed state back into groupFieldSync and sidebarSynced
watch(
    fieldSynced,
    () => {
        // syncable groups
        for (const section of sections.value) {
            if (section.type !== 'group' || !section.syncable) continue;
            const colorFields = section.fields.filter(
                (f) => f.type === 'color',
            );
            if (!colorFields.length) continue;
            const allOn = colorFields.every((f) => fieldSynced[f.key]);
            const allOff = colorFields.every((f) => !fieldSynced[f.key]);
            const newState = allOn ? true : allOff ? false : null;
            if (groupFieldSync[section.name] !== newState) {
                groupFieldSync[section.name] = newState;
            }
        }

        // sidebar
        const sidebarColorFields = fields.filter(
            (f) => f.key.startsWith('sidebar') && f.type === 'color',
        );
        if (sidebarColorFields.length) {
            const allOn = sidebarColorFields.every((f) => fieldSynced[f.key]);
            const allOff = sidebarColorFields.every((f) => !fieldSynced[f.key]);
            const newState = allOn ? true : allOff ? false : null;
            if (sidebarSynced.value !== newState)
                sidebarSynced.value = newState;
        }
    },
    { deep: true },
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
        <Sheet v-model:open="sheetOpen" :modal="false">
            <SheetContent
                side="right"
                class="flex flex-col gap-0 p-0 shadow-2xl sm:w-105 sm:max-w-none [&>button:last-child]:hidden"
                overlay-class="bg-black/5 blur-sm"
                @interact-outside="keepOpenWhileRevealing"
            >
                <TooltipProvider>
                    <SheetTitle class="sr-only">
                        {{ $t('Theme customizer') }}
                    </SheetTitle>
                    <SheetDescription class="sr-only">
                        {{ $t('Add your own flavor') }}
                    </SheetDescription>

                    <!-- Header -->
                    <div
                        class="border-border flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3"
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
                                {{ $t('Add your own flavor') }}
                            </p>
                        </div>
                        <ThemeSelector
                            class="order-4 w-full sm:order-3 sm:w-auto"
                            inline
                            hide-device
                        />
                        <button
                            data-testid="theme-panel-close"
                            class="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring order-3 rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:order-4"
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
                            @picked="selectTheme"
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
                                <Collapsible
                                    v-model:open="groupOpen[section.name]"
                                >
                                    <CollapsibleTrigger as-child>
                                        <button
                                            :data-testid="`group-${section.name.toLowerCase()}`"
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
                                            <div
                                                class="relative flex items-center gap-2"
                                            >
                                                <LinkToggle
                                                    v-if="
                                                        section.name ===
                                                        'Sidebar'
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
                                                <LinkToggle
                                                    v-if="section.syncable"
                                                    v-model="
                                                        groupFieldSync[
                                                            section.name
                                                        ]
                                                    "
                                                    :tooltip="
                                                        $t(
                                                            'Link all across light/dark modes',
                                                        )
                                                    "
                                                    :tooltip-active="
                                                        $t(
                                                            'All linked across modes — click to unlink',
                                                        )
                                                    "
                                                    :tooltip-indeterminate="
                                                        $t(
                                                            'Partially linked — click to link all',
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
                                                    v-if="
                                                        field.type === 'select'
                                                    "
                                                    class="space-y-1.5"
                                                >
                                                    <p
                                                        class="text-muted-foreground px-0.5 text-xs font-medium"
                                                    >
                                                        {{ $t(field.label) }}
                                                    </p>
                                                    <div
                                                        class="border-border flex overflow-hidden rounded-md border"
                                                    >
                                                        <button
                                                            v-for="option in (
                                                                field.props as {
                                                                    options: {
                                                                        value: string;
                                                                        label: string;
                                                                    }[];
                                                                }
                                                            ).options"
                                                            :key="option.value"
                                                            class="flex-1 p-2 text-xs transition-colors"
                                                            :class="
                                                                field.value ===
                                                                option.value
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                                            "
                                                            @click="
                                                                field.value =
                                                                    option.value
                                                            "
                                                        >
                                                            {{
                                                                $t(option.label)
                                                            }}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div
                                                    v-else-if="
                                                        field.type === 'font'
                                                    "
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
                                                    v-model:synced="
                                                        fieldSynced[field.key]
                                                    "
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
                                    :fonts="
                                        fontOptions[section.field.key] ?? []
                                    "
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
                            <Tooltip v-if="canSave && currentTheme?.editable">
                                <TooltipTrigger as-child>
                                    <button
                                        data-testid="theme-panel-delete"
                                        :aria-label="$t('Delete theme')"
                                        class="border-border text-destructive hover:bg-destructive/10 focus-visible:ring-ring flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                        @click="remove"
                                    >
                                        <IconTrash class="size-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {{ $t('Delete theme') }}
                                </TooltipContent>
                            </Tooltip>
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
                                v-if="canApply"
                                data-testid="theme-panel-apply"
                                class="border-border hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                @click="apply"
                            >
                                <IconPaintbrush class="size-4" />
                                {{ $t('Set as default') }}
                            </button>
                            <!-- Custom theme → Save / Save as menu; built-in → Save as only -->
                            <template v-if="canSave">
                                <DropdownMenu
                                    v-if="currentTheme?.editable"
                                    :modal="false"
                                >
                                    <DropdownMenuTrigger as-child>
                                        <button
                                            data-testid="theme-panel-save-dropdown"
                                            :aria-label="$t('Save')"
                                            class="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                        >
                                            <IconSave class="size-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            data-testid="theme-panel-save"
                                            @click="save"
                                        >
                                            {{ $t('Save') }}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            data-testid="theme-panel-save-as"
                                            @click="dialogSaveOpen = true"
                                        >
                                            {{ $t('Save as') }}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Tooltip v-else>
                                    <TooltipTrigger as-child>
                                        <button
                                            data-testid="theme-panel-save-as"
                                            class="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                            @click="dialogSaveOpen = true"
                                        >
                                            <IconSave class="size-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {{ $t('Save as') }}
                                    </TooltipContent>
                                </Tooltip>
                            </template>
                            <Tooltip v-if="!canApply">
                                <TooltipTrigger as-child>
                                    <button
                                        data-testid="theme-panel-command"
                                        :disabled="isDefault(selectedThemeId)"
                                        class="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
