## Themes module

`modules/themes` (namespace `Modules\Themes`) is a visual theme editor. **Set as default** (or
`php artisan saucebase:theme:apply {theme}`) rewrites `resources/css/theme.css` and
`resources/themes/default.json`; commit both.

- Theme logic lives in the module's `resources/js/lib/`, with no UI-framework, Inertia, or app imports.

Activate the `saucebase-themes-development` skill before changing this module.
