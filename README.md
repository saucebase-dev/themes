# Themes Module

<div align="center">

[![Tests](https://github.com/saucebase-dev/themes/actions/workflows/test.yml/badge.svg)](https://github.com/saucebase-dev/themes/actions/workflows/test.yml)
[![Release](https://img.shields.io/github/v/release/saucebase-dev/themes)](https://github.com/saucebase-dev/themes/releases)
[![Saucebase](https://img.shields.io/badge/Saucebase-1.1+-FF6B35)](https://github.com/saucebase-dev/saucebase)
[![PHP](https://img.shields.io/badge/PHP-8.4+-777BB4?logo=php&logoColor=white)](https://php.net)

Works with:<br/>
[![Vue 3.5](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org) [![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)

</div>

A visual theme editor for [Saucebase](https://github.com/saucebase-dev/saucebase), a Laravel SaaS starter kit.

Design your app's colours, fonts, radius and shadows in the browser, then make it your app's default with one click (or one command in CI). Nothing runs at request time once a theme is applied.

**[Full documentation →](https://saucebase-dev.github.io/docs/modules/themes)**

## Features

- **Theme editor** — a side panel on every page to edit colours, fonts, radius, spacing, letter spacing and shadows, with a live preview
- **Built-in themes** — 14 ready-made themes, from Default to Blueberry, Coffee and Sushi
- **Light and dark mode** — every theme defines both, and each field can be linked so it stays the same across modes
- **Colour picker** — a custom picker with hex and RGB input, the full Tailwind palette, and a screen eyedropper where the browser supports it
- **Google Fonts** — pick sans, serif and mono fonts from a searchable list; they load on demand while you edit
- **Shadows and radius** — set a few base values and the full shadow and radius scales are computed for you
- **Save your themes** — save, update and delete your own themes as JSON files
- **Bake into CSS** — `php artisan saucebase:theme:apply` writes the theme into `resources/css/theme.css`

## Requirements

|                |               |
| -------------- | ------------- |
| Saucebase core | `^1.1`        |
| Frontend       | Vue or React  |

## Installation

```bash
composer require saucebase/themes
npm run build
```

Open any page and use the palette button to open the editor.

## Applying a theme

The editor previews a theme in your browser only. To make it the app's theme for everyone, bake it into `resources/css/theme.css`:

- **Locally:** click **Set as default** (the paintbrush) in the editor. It writes what you see into `theme.css` and the picker's **Default** theme, and the dev server picks it up. The replaced one is kept as `storage/app/themes/default.json.backup`; copy it back over `default.json` to restore.
- **From the terminal or CI:**

```bash
php artisan saucebase:theme:apply blueberry
npm run build
```

Commit the updated `resources/css/theme.css`.

## Extending

**Add a theme.** Themes are JSON files. Save one from the editor, or drop a file into `storage/app/themes/`, and it shows up in the theme picker.

## Configuration

```env
THEMES_ENABLED=true    # show the editor
THEMES_WRITABLE=false  # allow saving presets from it
```

Both are on in `local` and off everywhere else, so production is safe out of the box.

- **Demo:** turn on `THEMES_ENABLED` only. Visitors can try themes live; their edits stay in their own browser.
- **Production writes:** `THEMES_WRITABLE=true` lets anyone who can see the editor save presets. Not recommended: design locally and commit the result instead.

For the theme file format and how the editor works, see the [documentation](https://saucebase-dev.github.io/docs/modules/themes).

## License

Proprietary. Part of [Saucebase](https://github.com/saucebase-dev/saucebase).
