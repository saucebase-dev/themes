---
name: saucebase-themes-development
description: Work on the Themes module (modules/themes) — the ThemePanel editor, theme JSON, CSS variable layers, shadow/radius/tracking scales, and saucebase:theme:apply. Use when changing theming, theme.css generation, or the panel in either stack.
---

# Themes Module

Paths are relative to `modules/themes/` unless they say otherwise. Commands run from the application root.

A developer-facing visual theming system for Saucebase. Lets the SaaS owner design a global app theme without writing CSS by hand.

**Core flow (local):** design in ThemePanel → **Set as default** → `resources/css/theme.css` and `resources/themes/default.json` are rewritten → commit both. The `saucebase:theme:apply {theme}` command does the same from a terminal or CI (then `npm run build`).

---

## Frontend layout

- `resources/js/lib/` — plain TypeScript (fields, theme vars, colour maths, the Tailwind palette). Theme logic goes here, not into a component, so the components stay thin. No UI-framework, Inertia, i18n or app imports (`@/`, `@js/`); `themeFields(trans)` takes the translator as an argument.
- `resources/js/components/` — the panel, picker and dialogs. Save/Command dialogs render inside the sheet so focus in them isn't treated as "outside".

---

## Features

- Built-in themes (`default` + food-named: beetroot, coffee, kiwi, etc.)
- Live visual editor (ThemePanel): colour pickers, fonts, shadow & radius sliders
- Light/dark: each theme defines both modes; per-field cross-mode sync (link toggle)
- Shadow, radius and tracking scales computed from single base vars (see below)
- Google Fonts loaded on demand
- Theme picker with circle-reveal transition (the app's `resources/js/lib/themeReveal.ts`)
- Preview persists in `localStorage` key `sb-theme-theme` (this browser only)
- Footer: Delete (saved presets) · Reset · **Set as default** (local only) · Save menu (Save / Save as)
- Filament admin theme: a separate settings page (`AdminThemeSettings`), colours/font/radius for the admin panel via `ThemesPlugin`

---

## Intended Usage

| Where | What the panel can do |
|-------|-----------------------|
| Local | Everything: preview, save/delete presets, Set as default |
| Demo (`THEMES_ENABLED=true`) | Preview only; edits stay in the visitor's browser |
| Production (defaults) | Panel hidden; the app shows the committed `theme.css` |

Theme selection is **global** (one theme for all users). Per-user or per-tenant theming is out of scope.

---

## Architecture

### Data flow

```
ThemePanel "Set as default" (POST /themes/apply, local only)
        ↓  ThemeService::applyToCss() + replaceDefault() (merges into default.json, so vars the editor doesn't manage stay)
resources/css/theme.css        ←  baked CSS vars (:root / .dark), what everyone sees
resources/themes/default.json  ←  the picker's "Default" entry, kept equal to theme.css
storage/app/themes/default.json.backup ← previous default; not listed; copy back to restore

ThemesServiceProvider  ←  discovers bundled + storage/app/themes/*.json, shares `themes` prop
        ↓  (items, fonts, canSave, canApply)
ThemePanel            ←  previews via inline CSS var overrides (applyThemeVars)
```

`saucebase:theme:apply {id}` calls the same `ThemeService::applyToCss()` (it does not touch `default.json`).

### JSON theme structure

Three sections per theme:

```json
{
  "cssVars": {
    "theme": {
      /* Mode-agnostic / structural:
         font-sans, font-serif, font-mono, spacing, tracking-normal
         radius + computed scale: radius-sm … radius-4xl
         tracking scale: tracking-tighter … tracking-widest
         shadow geometry: shadow-blur, shadow-spread, shadow-offset-x, shadow-offset-y
         shadow strings (light): shadow-2xs … shadow-2xl  ← computed from light values */
    },
    "light": {
      /* ONLY: all color vars + shadow-color + shadow-opacity */
    },
    "dark": {
      /* ONLY: all color vars + shadow-color + shadow-opacity */
    }
  }
}
```

**Important — PHP merge:** `ThemesServiceProvider::parseThemeFile()` merges
`theme + light` → `Theme.light` and `theme + dark` → `Theme.dark` before sending to the
frontend. The frontend `Theme` object always has all vars in both `.light` and `.dark`.

### What belongs where

| Var | Section | Reason |
|-----|---------|--------|
| `font-*`, `spacing` | `theme` | Never mode-specific |
| `radius` + `radius-sm … radius-4xl` | `theme` | Structural; scale computed by JS and stored |
| `tracking-normal` + `tracking-tighter … tracking-widest` | `theme` | Structural; scale computed by JS |
| `shadow-blur/spread/offset-x/offset-y` | `theme` | Structural — same in light/dark |
| `shadow-2xs … shadow-2xl` | `theme` | Computed from light shadow vars; stored for CLI bake |
| `shadow-opacity` | `light` + `dark` | Legitimately varies (dark needs higher opacity) |
| `shadow-color` | `light` + `dark` | Always different per mode |
| All color vars | `light` + `dark` | Mode-specific appearance |
| `letter-spacing` | ❌ nowhere | Dead var — use `tracking-normal` |

### CSS variable layers

```
theme.css :root          ← baked defaults (light mode + mode-agnostic)
theme.css .dark          ← baked dark overrides (ONLY colors + shadow-color + shadow-opacity)
theme.css @theme inline  ← Tailwind mappings + radius scale
    ↓ overridden by
documentElement inline styles  ← set by applyThemeVars() when a theme is active
```

---

## Key Files

| File | Role |
|------|------|
| `resources/themes/*.json` | Shipped themes; `default.json` mirrors theme.css |
| `storage/app/themes/*.json` | Saved presets (editable, deletable) |
| `resources/css/theme.css` | (app, not module) baked CSS output |
| `src/Services/ThemeService.php` | Discovery, parsing, `applyToCss()`, `replaceDefault()` |
| `src/Console/Commands/ApplyThemeCommand.php` | CLI wrapper around `applyToCss()` |
| `src/Http/Controllers/ThemesController.php` | store / update / destroy presets, apply |
| `src/Http/Requests/ApplyThemeRequest.php` | `cssVars` rules: size caps, keys `[a-z0-9-]`, values without `;{}\`, `/*` `*/`, `url(`, `image-set(` (they end up in theme.css); `SaveThemeRequest` extends it |
| `src/Http/Middleware/EnsureThemesWritable.php` | 404 on preset writes unless `themes.writable` |
| `src/Http/Middleware/EnsureLocalEnvironment.php` | 404 on apply outside `local` |
| `src/Providers/ThemesServiceProvider.php` | Shares the `themes` Inertia prop |
| `src/Filament/…`, `src/Admin/AdminTheme.php`, `src/Settings/AdminThemeSettings.php` | Filament admin theme |
| `resources/js/lib/fields.ts` | `themeFields()`: every editable field with type, vars, constraints |
| `resources/js/lib/theme.ts` | `applyThemeVars`, scale computations, font loading, `readCssVar`, `swatchRadiusSm` |
| `resources/js/lib/panel.ts` | `themeToJson` (panel state → payload, incl. the other mode's cached edits and both modes' shadow scales), `isPerMode`, `modeEdits`, mode sync helpers |
| `resources/js/lib/color.ts` | Colour conversions, `colorToHsv`, `contrastingIconColor`, `swatchBackground` |
| `resources/js/lib/tailwind.ts` | Tailwind palette for the colour picker, `filterPalette` |
| `resources/js/components/ThemePanel` | The editor |
| `resources/js/components/ThemePicker` | Theme switcher |
| `resources/js/components/DialogSave` | Save as dialog (same layout as the app confirm dialog) |

---

## Shadow System

Shadows are defined by **6 component vars** and computed into **8 shadow scale strings**.

**Component vars (stored in JSON):**
- `--shadow-color` — base color (per-mode, in light/dark)
- `--shadow-opacity` — opacity multiplier (per-mode, in light/dark; `perMode: true` in `themeFields()` — loaded, cached and restored per mode like colours)
- `--shadow-blur` — blur radius in px (mode-agnostic, in theme section)
- `--shadow-spread` — spread in px (mode-agnostic)
- `--shadow-offset-x` — x offset in px (mode-agnostic)
- `--shadow-offset-y` — y offset in px (mode-agnostic)

**Computed strings:** `--shadow-2xs` through `--shadow-2xl` — stored per mode in the JSON (light scale in `theme`, dark scale in `dark`, so `theme.css` bakes both `:root` and `.dark`) and recomputed by JS on every theme load / mode switch.

`computeShadows()` in `lib/theme.ts` generates all 8 strings using `color-mix(in srgb, <color> X%, transparent)`. Called in:
1. `applyThemeVars()` — on every theme load / mode switch
2. ThemePanel — on every shadow field edit (live preview)

---

## Radius Scale

Single source: `--radius` (stored in `theme` section of JSON).

`computeRadiusScale()` in `lib/theme.ts` returns 7 `calc()` strings:

```
--radius-sm:  calc(--radius - 4px)
--radius-md:  calc(--radius - 2px)
--radius-lg:  --radius  (no offset)
--radius-xl:  calc(--radius + 4px)
--radius-2xl: calc(--radius + 8px)
--radius-3xl: calc(--radius + 16px)
--radius-4xl: calc(--radius + 24px)
```

Computed scale is stored in the JSON `theme` section (for CLI bake) and applied as inline styles by `applyThemeVars()`.

---

## Tracking Scale

Single source: `--tracking-normal` (stored in `theme` section).

`computeTrackingScale()` in `lib/theme.ts` returns 6 em-offset strings:

```
--tracking-tighter: base - 0.050em
--tracking-tight:   base - 0.025em
--tracking-normal:  base + 0.000em
--tracking-wide:    base + 0.025em
--tracking-wider:   base + 0.050em
--tracking-widest:  base + 0.100em
```

---

## Field System (`fields.ts`)

All editable theme properties come from `themeFields()`. Each field has:
- `key` — matches JSON var name (without `--`)
- `type` — `color` | `unit` | `font`
- `vars` — CSS var names to write (always `--` prefixed)
- `group` — UI group (Brand, Surfaces, Typography, Shape, Shadow, Sidebar, Chart)
- `perMode` — `true` on `shadow-opacity` → `themeToJson()` writes it to `light`/`dark`, not `theme`

**Type behaviour in `themeToJson()` (`lib/panel.ts`):**
- `color` → written to `light` + `dark`
- `unit` (default) → written to `theme` section, mode-agnostic
- `unit` with `perMode: true` → written to `light` + `dark` (like color)
- `font` → written to `theme` section; triggers Google Fonts load + class injection

`MANAGED_VARS_SET` (derived from `themeFields()`) is the allowlist — `applyThemeVars()` ignores any vars not in this set, including pre-computed shadow strings.

---

## Per-Field Mode Sync

`fieldSynced: Record<string, boolean>` (keyed by `field.key`) tracks which fields are linked across light/dark modes. Clicking the lock/link icon button on a field row toggles its sync state.

When a synced field is edited in one mode, the value is mirrored to `modeSyncCache` and applied when switching modes. On mode switch, the watcher restores all synced field values from the cache.

---

## Config

```env
THEMES_ENABLED=   # show the ThemePanel — default: on in local only
THEMES_WRITABLE=  # allow save/update/delete of presets — default: on in local only
```

Owners may opt in outside local (e.g. a demo shows the panel with writes off). With `writable` off the write routes return 404 and the panel hides Save (`themes.canSave`). The write routes are `themes.store`, `themes.update` and `themes.destroy`; `themes.apply` (Set as default) only answers in the local environment. All are throttled (30/min) and `cssVars` is capped (100 keys per section, 255 chars per value).

---

## Commands

```bash
# Set a theme as default from the terminal (the panel's Set as default does this locally)
php artisan saucebase:theme:apply {theme-id}
npm run build   # or keep `npm run dev` running
```

---

## Testing

```bash
php -d memory_limit=2048M artisan test --compact modules/themes/tests/   # PHP
npm run test:unit                                                        # lib/ (Vitest)
npx playwright test --project="@themes*"                                 # E2E
```

- `tests/Feature/ThemesApplyTest.php`: Set as default (local only, theme.css + default.json + backup)
- `tests/Feature/ThemesAccessTest.php`: `enabled`/`writable` flags, throttling, payload caps
- `tests/Feature/ThemesControllerTest.php`, `ThemesConfigTest.php`: preset CRUD, shared props
- `tests/Feature/ApplyThemeCommandTest.php`: CSS patching via the command
- `tests/Feature/AdminTheme*Test.php`: Filament admin theme
- `resources/js/lib/*.test.ts`: colour maths, fields, theme vars, panel payload, Tailwind palette

Tests that simulate `local` must disable `PreventRequestForgery`: Laravel only skips CSRF in `testing`.
