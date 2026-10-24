# Saucebase Themes

<div align="center">

[![Tests](https://github.com/saucebase-dev/themes/actions/workflows/test.yml/badge.svg)](https://github.com/saucebase-dev/themes/actions/workflows/test.yml)
[![Release](https://img.shields.io/github/v/release/saucebase-dev/themes)](https://github.com/saucebase-dev/themes/releases)
[![Saucebase Core](https://img.shields.io/packagist/dependency-v/saucebase/themes/saucebase%2Fcore?label=Saucebase%20Core&color=FF6B35)](https://github.com/saucebase-dev/core)
[![License](https://img.shields.io/github/license/saucebase-dev/themes)](LICENSE)

</div>

A visual theme editor for Saucebase: colours, fonts, radius and shadows, with live preview.

A module for [Saucebase](https://github.com/saucebase-dev/saucebase), the AI-ready Laravel SaaS kit. Modules are Composer packages you add to a Saucebase app; once installed, the code is yours to change.

## Features

- **Theme editor**: a side panel on every page with a live preview
- **Built-in themes**, ready to use or start from
- **Light and dark mode** in every theme
- **Colour picker** with the Tailwind palette and an eyedropper
- **Google Fonts**, loaded on demand
- **Shadow and radius scales** computed from a few base values
- **Save your own themes** as JSON files
- **Set as default**: bake a theme into `resources/css/theme.css` from the editor or with `php artisan saucebase:theme:apply <theme>`
- **Admin theme**: colours, font and radius for the admin panel
- **Vue and React**

## Install

**New to Saucebase?** Start a new app and pick **themes** when it asks for modules:

```bash
curl -fsSL https://install.saucebase.dev | bash
```

It installs PHP and Composer if they're missing. With the CLI already installed, run `saucebase new my-app` instead.

**Already have a Saucebase app?** Add it with:

```bash
php artisan saucebase:module-install themes
npm install && npm run build
```

Open any page and use the palette button to open the editor. When you're happy with a theme, **Set as default** and commit `resources/css/theme.css`.

## Configuration

The editor is on in `local` and off everywhere else. To change that, add to `.env`:

```env
THEMES_ENABLED=true
THEMES_WRITABLE=false
```

`THEMES_ENABLED` shows the editor; `THEMES_WRITABLE` lets it save themes. On a public site, leave writing off: visitors' edits then stay in their own browser.

The admin panel theme is under **Settings → Admin theme**.

## Demo data

```bash
php artisan modules:seed --module=themes --demo
```

Adds a staff account (`themes@saucebase.dev`) that only sees the admin theme settings. It uses the `DEMO_PASSWORD` from `.env`.

## License

MIT. See [LICENSE](LICENSE).
