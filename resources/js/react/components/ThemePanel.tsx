import ThemeSelector from '@/components/ThemeSelector';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useDialog } from '@/hooks/useDialog';
import { useHttp } from '@/hooks/useHttp';
import { useT } from '@/i18n';
import { router, usePage } from '@inertiajs/react';
import {
    isRevealing,
    revealTransition,
    type RevealOrigin,
} from '@js/lib/themeReveal';
import {
    useEffect,
    useLayoutEffect,
    useReducer,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import { toast } from 'sonner';
import IconChevronDown from '~icons/lucide/chevron-down';
import IconPaintbrush from '~icons/lucide/paintbrush';
import IconPalette from '~icons/lucide/palette';
import IconRotateCcw from '~icons/lucide/rotate-ccw';
import IconSave from '~icons/lucide/save';
import IconTerminal from '~icons/lucide/terminal';
import IconTrash from '~icons/lucide/trash-2';
import IconX from '~icons/lucide/x';
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
import {
    applyFieldToDom,
    applyThemeVars,
    clearThemeOverrides,
    computeShadows,
    readCssVar,
    setProperty,
    THEME_STORAGE_KEY,
} from '../../lib/theme';
import type { FieldGroup, FieldState, Font, Theme } from '../../types';
import { useIsDark } from '../hooks/useIsDark';
import ColorInput from './ColorInput';
import DialogCommand from './DialogCommand';
import DialogSave from './DialogSave';
import FontPicker from './FontPicker';
import LinkToggle from './LinkToggle';
import SliderInput from './SliderInput';
import ThemePicker from './ThemePicker';

const SHADOW_KEYS = new Set([
    'shadow-color',
    'shadow-opacity',
    'shadow-blur',
    'shadow-spread',
    'shadow-offset-x',
    'shadow-offset-y',
]);

type Mode = 'light' | 'dark';

/**
 * The panel's working state. Mutable, like the Vue panel's `reactive()` state: the
 * DOM is updated as values change, and `rerender()` refreshes the UI afterwards.
 */
type PanelModel = {
    selectedId: string | null;
    fields: FieldState[];
    /** Per-field cross-mode link. */
    synced: Record<string, boolean>;
    /** Values of linked fields — survive dark/light switches. */
    syncCache: Record<string, string>;
    /** Per-mode colour edits — survive dark/light switches. */
    modeEdits: Record<Mode, Record<string, string>>;
    /** Field values as loaded from the theme — used to detect live edits. */
    original: Record<string, string>;
};

type GroupSection = FieldGroup & { type: 'group'; fields: FieldState[] };
type Section = { type: 'standalone'; field: FieldState } | GroupSection;

/** true when all are on, false when all are off, null when mixed. */
function triState(values: boolean[]): boolean | null {
    if (values.every(Boolean)) return true;
    if (!values.some(Boolean)) return false;
    return null;
}

function isSidebarColor(field: FieldState): boolean {
    return field.key.startsWith('sidebar') && field.type === 'color';
}

const footerIconButton =
    'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none';
const footerTextButton =
    'border-border hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none';

function IconTooltip({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

export default function ThemePanel() {
    const t = useT();
    const page = usePage();
    const isDark = useIsDark();
    const { confirm, isOpen: isConfirming } = useDialog();
    const http = useHttp({});
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    const themesProp = page.props?.themes;
    const themes: Theme[] = themesProp?.items ?? [];
    const canSave = themesProp?.canSave === true;
    const canApply = themesProp?.canApply === true;
    const fontOptions: Record<string, Font[]> = {
        'font-sans': themesProp?.fonts?.sans ?? [],
        'font-serif': themesProp?.fonts?.serif ?? [],
        'font-mono': themesProp?.fonts?.mono ?? [],
    };

    // Read by callbacks that outlive a render (reveal transitions, request callbacks).
    const themesRef = useRef(themes);
    themesRef.current = themes;
    const isDarkRef = useRef(isDark);
    isDarkRef.current = isDark;

    const modelRef = useRef<PanelModel | null>(null);
    if (!modelRef.current) {
        modelRef.current = {
            selectedId:
                typeof localStorage !== 'undefined'
                    ? localStorage.getItem(THEME_STORAGE_KEY)
                    : null,
            fields: themeFields(t).map((f) => ({ ...f, value: '' })),
            synced: {},
            syncCache: {},
            modeEdits: { light: {}, dark: {} },
            original: {},
        };
    }
    const m = modelRef.current;

    const [sheetOpen, setSheetOpen] = useState(false);
    const [saveOpen, setSaveOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(
            m.fields
                .filter((f) => f.group)
                .map((f) => [f.group!.name, !(f.group!.collapsed ?? false)]),
        ),
    );
    // The floating trigger is portalled to <body>, which only exists in the browser.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // ── Theme selection ───────────────────────────────────────────────────────

    const defaultThemeId = (list: Theme[] = themesRef.current) =>
        list[0]?.id ?? 'default';

    const findTheme = (id: string | null, list: Theme[] = themesRef.current) =>
        list.find((th) => th.id === id) ?? list[0] ?? null;

    const currentTheme = findTheme(m.selectedId, themes);
    const selectedThemeId = currentTheme?.id ?? defaultThemeId(themes);

    function isDefault(id: string): boolean {
        return id === '' || id === 'default' || id === defaultThemeId();
    }

    function setThemeId(id: string): void {
        m.selectedId = id;
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
        list: Theme[] = themesRef.current,
    ): Promise<void> {
        if (id === m.selectedId && list === themesRef.current) {
            return;
        }

        await revealTransition(origin, () => {
            setThemeId(id);
            loadTheme(findTheme(id, list), true);
            flushSync(rerender);
        });
    }

    // ── Field updates (what the Vue panel's watchers do) ──────────────────────

    function setSynced(field: FieldState, on: boolean): void {
        m.synced[field.key] = on;
        if (on && field.value !== '') {
            m.syncCache[field.key] = field.value;
        } else {
            delete m.syncCache[field.key];
        }
    }

    /** Set a value and preview it. */
    function applyValue(field: FieldState, value: string): void {
        field.value = value;
        if (value === '') return;
        applyFieldToDom(field, value);
        if (m.synced[field.key]) m.syncCache[field.key] = value;
    }

    function applyShadowVars(): void {
        const args = shadowArgs(m.fields);
        if (!args) return;
        for (const [key, value] of Object.entries(computeShadows(...args))) {
            setProperty(key, value);
        }
    }

    const sidebarColors = () => m.fields.filter(isSidebarColor);
    const sidebarSynced = () =>
        triState(sidebarColors().map((f) => !!m.synced[f.key]));

    function applySidebarSync(): void {
        for (const [sidebarKey, sourceKey] of SIDEBAR_SYNC_MAP) {
            const source = m.fields.find((f) => f.key === sourceKey);
            const target = m.fields.find((f) => f.key === sidebarKey);
            if (source && target) applyValue(target, source.value);
        }
    }

    /** A user edit: preview it, then keep derived values in step. */
    function setFieldValue(field: FieldState, value: string): void {
        applyValue(field, value);
        if (SHADOW_KEYS.has(field.key)) applyShadowVars();
        if (
            sidebarSynced() === true &&
            SIDEBAR_SYNC_MAP.some(([, source]) => source === field.key)
        ) {
            applySidebarSync();
        }
        rerender();
    }

    function snapshotOriginal(): void {
        m.original = Object.fromEntries(m.fields.map((f) => [f.key, f.value]));
    }

    function populateFieldsFromTheme(theme: Theme): void {
        for (const field of m.fields) {
            applyValue(
                field,
                fieldValueFromTheme(
                    field,
                    theme,
                    isDarkRef.current,
                    readCssVar,
                ),
            );
        }
        // Detect the sidebar's link state from the loaded values; never force it, or
        // sidebar colours would be overwritten with the surface colours on load.
        const allSidebarSynced = sidebarInSync(m.fields);
        for (const field of sidebarColors()) {
            setSynced(field, allSidebarSynced);
        }
        snapshotOriginal();
        applyShadowVars();
    }

    function loadTheme(theme: Theme | null, switching: boolean): void {
        if (!theme) return;
        if (switching) {
            m.modeEdits = { light: {}, dark: {} };
        }
        applyThemeVars(theme, isDarkRef.current);
        populateFieldsFromTheme(theme);
    }

    // Load the selected theme on mount.
    const loaded = useRef(false);
    useLayoutEffect(() => {
        if (loaded.current || !currentTheme) return;
        loaded.current = true;
        loadTheme(currentTheme, false);
        rerender();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTheme]);

    // Re-apply the theme when dark/light switches, keeping live edits per mode.
    const previousDark = useRef(isDark);
    useLayoutEffect(() => {
        if (previousDark.current === isDark) return;
        previousDark.current = isDark;

        const theme = findTheme(m.selectedId);
        const leaving: Mode = isDark ? 'light' : 'dark';
        const entering: Mode = isDark ? 'dark' : 'light';
        const leavingVars = (isDark ? theme?.light : theme?.dark) ?? {};

        // Keep only genuine edits for the leaving mode. Saving every value would pollute
        // the cache when the panel starts in dark mode (values already hold dark colours).
        m.modeEdits[leaving] = modeEdits(m.fields, leavingVars);

        applyThemeVars(theme, isDark);

        for (const field of m.fields) {
            // Mode-agnostic fields — always re-apply.
            if (!isPerMode(field) && field.value !== '') {
                applyFieldToDom(field, field.value);
            }

            // Cross-mode linked fields take precedence over per-mode edits.
            if (m.synced[field.key] && m.syncCache[field.key] !== undefined) {
                applyValue(field, m.syncCache[field.key]);
                continue;
            }

            if (isPerMode(field)) {
                const savedEdit = m.modeEdits[entering][field.key];
                if (savedEdit !== undefined) {
                    applyValue(field, savedEdit);
                } else if (theme) {
                    // No user edit — show the entering mode's own value.
                    const themeDefault = fieldValueFromTheme(
                        field,
                        theme,
                        isDark,
                        readCssVar,
                    );
                    if (field.value !== themeDefault) {
                        applyValue(field, themeDefault);
                    }
                }
            }
        }

        // applyThemeVars() cleared the composite shadow vars (--shadow-md etc.).
        applyShadowVars();
        rerender();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDark]);

    // ── Link toggles ──────────────────────────────────────────────────────────

    function setFieldSynced(field: FieldState, on: boolean): void {
        setSynced(field, on);
        rerender();
    }

    function setGroupSynced(section: GroupSection, on: boolean): void {
        for (const field of section.fields) {
            if (field.type === 'color') setSynced(field, on);
        }
        rerender();
    }

    function setSidebarSynced(on: boolean): void {
        if (on) applySidebarSync();
        for (const field of sidebarColors()) setSynced(field, on);
        rerender();
    }

    // ── Sections (group fields into cards, standalone otherwise) ──────────────

    const sections: Section[] = [];
    const groupMap = new Map<string, GroupSection>();
    for (const field of m.fields) {
        if (!field.group) {
            sections.push({ type: 'standalone', field });
            continue;
        }
        let section = groupMap.get(field.group.name);
        if (!section) {
            section = { type: 'group', ...field.group, fields: [] };
            groupMap.set(field.group.name, section);
            sections.push(section);
        }
        section.fields.push(field);
    }

    // ── Derived state ─────────────────────────────────────────────────────────

    const hasLiveEdits = m.fields.some((f) => f.value !== m.original[f.key]);
    const canReset = !isDefault(selectedThemeId) || hasLiveEdits;

    function toJson(name: string) {
        return themeToJson({
            fields: m.fields,
            synced: m.synced,
            isDark: isDarkRef.current,
            base: findTheme(m.selectedId),
            name,
            otherModeEdits: m.modeEdits[isDarkRef.current ? 'light' : 'dark'],
        });
    }

    /**
     * Clicks that are not really "outside" the panel: during a reveal the transition
     * layer sits above everything, so a click lands on <html>; and a confirm dialog
     * opened from the panel sits outside it.
     */
    function keepOpenWhileRevealing(event: Event): void {
        if (isRevealing() || isConfirming) {
            event.preventDefault();
        }
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    async function reset(): Promise<void> {
        const ok = await confirm({
            title: t('Reset theme'),
            description: t(
                'All changes will be lost and the theme will return to its defaults.',
            ),
            confirmLabel: t('Reset'),
            cancelLabel: t('Cancel'),
            variant: 'destructive',
            icon: IconRotateCcw,
            align: 'left',
        });
        if (!ok) return;

        clearThemeOverrides();
        m.modeEdits = { light: {}, dark: {} };
        const defaultId = defaultThemeId();
        setThemeId(defaultId);
        loadTheme(findTheme(defaultId), true);
        rerender();
    }

    function save(): void {
        const theme = findTheme(m.selectedId);
        if (!theme?.editable) return;

        http.transform(() => toJson(theme.name));
        http.put(route('themes.update', { name: theme.id }), {
            onSuccess() {
                snapshotOriginal();
                rerender();
                toast.success(t('Theme updated successfully'), {
                    testId: 'theme-updated-toast',
                });
            },
            onError() {
                toast.error(t('Failed to update theme'));
            },
        });
    }

    async function remove(): Promise<void> {
        const theme = findTheme(m.selectedId);
        if (!theme?.editable) return;

        const ok = await confirm({
            title: t('Delete theme'),
            description: t('This saved theme will be deleted permanently.'),
            confirmLabel: t('Delete'),
            cancelLabel: t('Cancel'),
            variant: 'destructive',
            icon: IconTrash,
        });
        if (!ok) return;

        http.delete(route('themes.destroy', { name: theme.id }), {
            onSuccess() {
                void selectTheme(defaultThemeId());
                router.reload({ only: ['themes'] });
                toast.success(t('Theme deleted'), {
                    testId: 'theme-deleted-toast',
                });
            },
            onError() {
                toast.error(t('Failed to delete theme'));
            },
        });
    }

    async function apply(): Promise<void> {
        const ok = await confirm({
            title: t('Set as default'),
            description: t(
                'Everyone will see this theme by default. Commit the change to keep it.',
            ),
            confirmLabel: t('Set as default'),
            cancelLabel: t('Cancel'),
            icon: IconPaintbrush,
        });
        if (!ok) return;

        const { cssVars } = toJson(findTheme(m.selectedId)?.name ?? '');
        http.transform(() => ({ cssVars }));
        http.post(route('themes.apply'), {
            onSuccess() {
                // Default now holds these values; show it as the current theme.
                router.reload({
                    only: ['themes'],
                    onSuccess: (reloaded) => {
                        const items =
                            (reloaded.props.themes?.items as Theme[]) ?? [];
                        void selectTheme(defaultThemeId(items), null, items);
                        toast.success(t('Theme set as default'), {
                            testId: 'theme-default-set-toast',
                        });
                    },
                });
            },
            onError() {
                toast.error(t('Failed to set theme as default'));
            },
        });
    }

    if (!themesProp) {
        return null;
    }

    // ── Render ────────────────────────────────────────────────────────────────

    function renderField(field: FieldState): ReactNode {
        if (field.type === 'select') {
            return (
                <div key={field.key} className="space-y-1.5">
                    <p className="text-muted-foreground px-0.5 text-xs font-medium">
                        {field.label}
                    </p>
                    <div className="border-border flex overflow-hidden rounded-md border">
                        {field.props?.options.map((option) => (
                            <button
                                key={option.value}
                                className={`flex-1 p-2 text-xs transition-colors ${
                                    field.value === option.value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                                onClick={() =>
                                    setFieldValue(field, option.value)
                                }
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (field.type === 'font') {
            return (
                <div key={field.key} className="space-y-1.5">
                    <p className="text-muted-foreground px-0.5 text-xs font-medium">
                        {field.label}
                    </p>
                    <FontPicker
                        fonts={fontOptions[field.key] ?? []}
                        testId={`font-picker-${field.key}`}
                        value={field.value}
                        onChange={(v) => setFieldValue(field, v)}
                    />
                </div>
            );
        }

        if (field.type === 'unit') {
            return (
                <SliderInput
                    key={field.key}
                    label={field.label}
                    testId={`slider-input-${field.key}`}
                    value={field.value}
                    onChange={(v) => setFieldValue(field, v)}
                    {...field.props}
                />
            );
        }

        return (
            <ColorInput
                key={field.key}
                label={field.label}
                testId={`color-input-${field.key}`}
                value={field.value}
                onChange={(v) => setFieldValue(field, v)}
                synced={!!m.synced[field.key]}
                onSyncedChange={(on) => setFieldSynced(field, on)}
            />
        );
    }

    function renderGroup(section: GroupSection): ReactNode {
        const open = groupOpen[section.name] ?? true;
        const colorFields = section.fields.filter((f) => f.type === 'color');

        return (
            <div
                key={section.name}
                className="border-border rounded-lg border shadow-sm"
            >
                <Collapsible
                    open={open}
                    onOpenChange={(v) =>
                        setGroupOpen((g) => ({ ...g, [section.name]: v }))
                    }
                >
                    <CollapsibleTrigger asChild>
                        <button
                            data-testid={`group-${section.name.toLowerCase()}`}
                            className={`focus-visible:ring-ring flex w-full cursor-pointer items-center justify-between px-4 py-3 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${open ? 'border-border border-b' : 'rounded-lg'}`}
                        >
                            <span className="text-foreground text-xs font-bold tracking-wider uppercase">
                                {section.name}
                            </span>
                            <div className="relative flex items-center gap-2">
                                {section.name === t('Sidebar') && (
                                    <LinkToggle
                                        value={sidebarSynced()}
                                        onChange={setSidebarSynced}
                                        tooltip={t(
                                            'Sync sidebar colors with main theme',
                                        )}
                                        tooltipActive={t(
                                            'Sidebar is synced with main theme colors — click to disable',
                                        )}
                                    />
                                )}
                                {section.syncable && colorFields.length > 0 && (
                                    <LinkToggle
                                        value={triState(
                                            colorFields.map(
                                                (f) => !!m.synced[f.key],
                                            ),
                                        )}
                                        onChange={(on) =>
                                            setGroupSynced(section, on)
                                        }
                                        tooltip={t(
                                            'Link all across light/dark modes',
                                        )}
                                        tooltipActive={t(
                                            'All linked across modes — click to unlink',
                                        )}
                                        tooltipIndeterminate={t(
                                            'Partially linked — click to link all',
                                        )}
                                    />
                                )}
                                <IconChevronDown
                                    className={`text-muted-foreground size-4 shrink-0 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
                                />
                            </div>
                        </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="space-y-2 p-2">
                            {section.fields.map(renderField)}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        );
    }

    return (
        <>
            {/* Floating trigger — hidden while panel is open */}
            {mounted &&
                !sheetOpen &&
                createPortal(
                    <div className="gradient-border-spin fixed top-[calc(50%-1.5rem)] right-3 z-50 rounded-xl p-0.5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                        <button
                            data-testid="theme-panel-trigger"
                            aria-label={t('Toggle color theme panel')}
                            className="text-foreground focus-visible:ring-ring relative flex size-12 cursor-pointer items-center justify-center rounded-xl bg-white/40 backdrop-blur-sm transition-colors hover:bg-white/60 focus-visible:ring-2 focus-visible:outline-none dark:bg-gray-900/40 dark:hover:bg-gray-900/60"
                            onClick={() => setSheetOpen(true)}
                        >
                            <IconPalette className="size-6 shrink-0" />
                            {canReset && (
                                <span className="text-destructive/50 bg-destructive absolute -top-0.5 right-0.5 flex size-2 items-center justify-center rounded-lg shadow-lg ring-2" />
                            )}
                        </button>
                    </div>,
                    document.body,
                )}

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen} modal={false}>
                <SheetContent
                    side="right"
                    showCloseButton={false}
                    className="flex flex-col gap-0 p-0 shadow-2xl sm:w-105 sm:max-w-none"
                    onInteractOutside={keepOpenWhileRevealing}
                >
                    <TooltipProvider>
                        <SheetTitle className="sr-only">
                            {t('Theme customizer')}
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                            {t('Add your own flavor')}
                        </SheetDescription>

                        {/* Header */}
                        <div className="border-border flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3">
                            <IconPalette className="text-muted-foreground size-5 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-foreground text-sm leading-none font-semibold">
                                    {t('Theme customizer')}
                                </p>
                                <p className="text-muted-foreground mt-0.5 text-xs">
                                    {t('Add your own flavor')}
                                </p>
                            </div>
                            <div className="order-4 w-full sm:order-3 sm:w-auto">
                                <ThemeSelector inline hideDevice />
                            </div>
                            <button
                                data-testid="theme-panel-close"
                                className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring order-3 rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:order-4"
                                aria-label={t('Close theme panel')}
                                onClick={() => setSheetOpen(false)}
                            >
                                <IconX className="size-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-4 overflow-y-auto p-3 pb-12">
                            <ThemePicker
                                options={themes}
                                value={selectedThemeId}
                                onPicked={(id, origin) =>
                                    void selectTheme(id, origin)
                                }
                            />

                            {sections.map((section) =>
                                section.type === 'group'
                                    ? renderGroup(section)
                                    : renderField(section.field),
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-border bg-background/20 border-t p-3">
                            <div className="flex gap-2">
                                {canSave && currentTheme?.editable && (
                                    <IconTooltip label={t('Delete theme')}>
                                        <button
                                            data-testid="theme-panel-delete"
                                            aria-label={t('Delete theme')}
                                            className="border-border text-destructive hover:bg-destructive/10 focus-visible:ring-ring flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                            onClick={remove}
                                        >
                                            <IconTrash className="size-4" />
                                        </button>
                                    </IconTooltip>
                                )}
                                <button
                                    data-testid="theme-panel-reset"
                                    disabled={!canReset}
                                    className={`${footerTextButton} disabled:cursor-not-allowed disabled:opacity-50`}
                                    onClick={reset}
                                >
                                    <IconRotateCcw className="size-4" />
                                    {t('Reset')}
                                </button>
                                {canApply && (
                                    <button
                                        data-testid="theme-panel-apply"
                                        className={footerTextButton}
                                        onClick={apply}
                                    >
                                        <IconPaintbrush className="size-4" />
                                        {t('Set as default')}
                                    </button>
                                )}
                                {/* Custom theme → Save / Save as menu; built-in → Save as only */}
                                {canSave &&
                                    (currentTheme?.editable ? (
                                        <DropdownMenu modal={false}>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    data-testid="theme-panel-save-dropdown"
                                                    aria-label={t('Save')}
                                                    className={footerIconButton}
                                                >
                                                    <IconSave className="size-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    data-testid="theme-panel-save"
                                                    onClick={save}
                                                >
                                                    {t('Save')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    data-testid="theme-panel-save-as"
                                                    onClick={() =>
                                                        setSaveOpen(true)
                                                    }
                                                >
                                                    {t('Save as')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ) : (
                                        <IconTooltip label={t('Save as')}>
                                            <button
                                                data-testid="theme-panel-save-as"
                                                className={footerIconButton}
                                                onClick={() =>
                                                    setSaveOpen(true)
                                                }
                                            >
                                                <IconSave className="size-4" />
                                            </button>
                                        </IconTooltip>
                                    ))}
                                {!canApply && (
                                    <IconTooltip
                                        label={t('How to use this theme')}
                                    >
                                        <button
                                            data-testid="theme-panel-command"
                                            disabled={isDefault(
                                                selectedThemeId,
                                            )}
                                            className={`${footerIconButton} disabled:cursor-not-allowed disabled:opacity-50`}
                                            onClick={() => setCommandOpen(true)}
                                        >
                                            <IconTerminal className="size-4" />
                                        </button>
                                    </IconTooltip>
                                )}
                            </div>
                        </div>
                    </TooltipProvider>

                    {/* Inside the sheet's tree, so focus in them doesn't read as "outside". */}
                    <DialogCommand
                        open={commandOpen}
                        onOpenChange={setCommandOpen}
                        themeId={selectedThemeId}
                    />
                    <DialogSave
                        open={saveOpen}
                        onOpenChange={setSaveOpen}
                        toJson={toJson}
                        onThemeSaved={(id, items) =>
                            void selectTheme(id, null, items)
                        }
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}
