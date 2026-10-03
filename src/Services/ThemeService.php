<?php

namespace Modules\Themes\Services;

use RuntimeException;

class ThemeService
{
    public const BUNDLE_THEMES_DIR = 'resources/themes';

    public const USER_THEMES_DIR = 'app/themes';

    public const FONTS_DIR = 'resources/fonts';

    /**
     * Get the file path for a user-defined theme JSON file based on the given filename.
     *
     * @param  string  $filename  The name of the theme file (without extension, e.g. "blueberry")
     * @return string The full file path to the user theme JSON file
     */
    public static function getUserThemePath(string $filename): string
    {
        return static::getUserThemesDir()."/{$filename}.json";
    }

    /**
     * Write a user theme to storage/app/themes, creating the directory on first use.
     *
     * @param  array<string, mixed>  $theme
     */
    public static function saveUserTheme(string $filename, array $theme): void
    {
        self::ensureUserThemesDir();

        file_put_contents(static::getUserThemePath($filename), json_encode($theme, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private static function ensureUserThemesDir(): void
    {
        if (! is_dir(static::getUserThemesDir())) {
            mkdir(static::getUserThemesDir(), 0755, true);
        }
    }

    /**
     * Get the file path for a theme JSON file in the default themes directory based on the given filename.
     *
     * @param  string  $filename  The name of the theme file (without extension, e.g. "blueberry")
     * @return string The full file path to the default theme JSON file
     */
    public static function getBundleThemePath(string $filename): string
    {
        return static::getBundleThemesDir()."/{$filename}.json";
    }

    /**
     * Check if a theme with the given name exists in either the user themes directory or the default themes directory.
     *
     * @param  string  $name  The name of the theme to check (e.g. "blueberry")
     * @return bool True if the theme exists, false otherwise
     */
    public static function themeExists(string $name): bool
    {
        return file_exists(static::getUserThemePath($name))
            || file_exists(static::getBundleThemePath($name));
    }

    /**
     * Load font metadata from a JSON file for the specified category (e.g. "sans", "serif", "mono").
     *  The JSON file should contain an array of font objects with properties such as family, category, variants, and variable.
     *
     * @param  string  $category  The font category (e.g. "sans", "serif", "mono")
     * @return list<array{family: string, category: string, variants: list<string>, variable?: bool}>
     */
    public static function loadFonts(string $category): array
    {
        $file = module_path('Themes', self::FONTS_DIR."/{$category}.json");
        $content = file_get_contents($file);

        return $content !== false ? json_decode($content, true) ?? [] : [];
    }

    /**
     * Get the directory path where default theme JSON files are stored within the module's resources. These themes are typically read-only and shipped with the application.
     *
     * @return string The full directory path for default themes
     */
    public static function getBundleThemesDir(): string
    {
        return module_path('Themes', self::BUNDLE_THEMES_DIR);
    }

    /**
     * Get the directory path where user-defined theme JSON files are stored. This is typically a writable directory within the application's storage path.
     *
     * @return string The full directory path for user-defined themes
     */
    public static function getUserThemesDir(): string
    {
        return storage_path(self::USER_THEMES_DIR);
    }

    /**
     * Discover available themes by scanning both the default themes directory and the user themes directory.
     * User themes take precedence over default themes with the same name. The returned list is sorted with the "default" theme first (if it exists) and the rest in no particular order.
     *
     * @return array<int, array{id: string, name: string, description: string, light: array<string, string>, dark: array<string, string>, editable: bool}>
     */
    public static function discoverThemes(): array
    {
        $shipped = glob(static::getBundleThemesDir().'/*.json') ?: [];
        $userDir = static::getUserThemesDir();
        $user = is_dir($userDir) ? (glob($userDir.'/*.json') ?: []) : [];

        sort($shipped);
        sort($user);

        // Shipped palettes first; user palettes appended. Deduplicate by id — user wins.
        $byId = [];
        foreach ($shipped as $file) {
            $parsed = static::parseThemeFile($file);
            if ($parsed !== null) {
                $parsed['editable'] = false;
                $byId[$parsed['id']] = $parsed;
            }
        }
        foreach ($user as $file) {
            $parsed = static::parseThemeFile($file);
            if ($parsed !== null) {
                $parsed['editable'] = true;
                $byId[$parsed['id']] = $parsed;
            }
        }

        $themes = array_values($byId);

        usort($themes, fn ($a, $b) => ($a['id'] === 'default' ? -1 : ($b['id'] === 'default' ? 1 : 0)));

        return $themes;
    }

    /**
     * Retrieve the contents of a theme JSON file by searching both the bundled themes directory
     * and the user themes directory.
     *
     * @param  string  $theme  The theme filename without the `.json` extension
     * @return string|false The theme file contents if found, or false if no matching file exists
     */
    public static function getTheme(string $theme): string|false
    {
        $bundlePath = static::getBundleThemePath($theme);
        if (file_exists($bundlePath)) {
            return file_get_contents($bundlePath);
        }

        $userPath = static::getUserThemePath($theme);
        if (file_exists($userPath)) {
            return file_get_contents($userPath);
        }

        return false;
    }

    /**
     * Parse a theme JSON file and return its data as an associative array.
     * The returned array includes the theme's ID, name, description, and CSS variables for light and dark modes.
     *
     * @return array{id: string, name: string, description: string, light: array<string, string>, dark: array<string, string>}|null Note: callers are responsible for adding the `editable` key after calling this method.
     */
    public static function parseThemeFile(string $file): ?array
    {
        if (! is_file($file)) {
            return null;
        }

        $content = file_get_contents($file);

        if ($content === false) {
            return null;
        }

        /** @var array<string, mixed>|null $data */
        $data = json_decode($content, true);

        if (! is_array($data)) {
            return null;
        }

        if (empty($data['name']) || ! isset($data['cssVars'])) {
            return null;
        }

        /** @var array<string, string> $themeVars */
        $themeVars = isset($data['cssVars']['theme']) && is_array($data['cssVars']['theme'])
            ? self::prefixKeys($data['cssVars']['theme'])
            : [];

        /** @var array<string, string> $lightVars */
        $lightVars = isset($data['cssVars']['light']) && is_array($data['cssVars']['light'])
            ? self::prefixKeys($data['cssVars']['light'])
            : [];

        /** @var array<string, string> $darkVars */
        $darkVars = isset($data['cssVars']['dark']) && is_array($data['cssVars']['dark'])
            ? self::prefixKeys($data['cssVars']['dark'])
            : [];

        return [
            'id' => (string) $data['name'],
            'name' => isset($data['title']) ? (string) $data['title'] : ucfirst(basename($file, '.json')),
            'description' => isset($data['description']) ? (string) $data['description'] : '',
            'light' => array_merge($themeVars, $lightVars),
            'dark' => array_merge($themeVars, $darkVars),
        ];
    }

    /**
     * Make `cssVars` the shipped "default" theme, so the picker's Default entry keeps
     * matching theme.css. The replaced file is kept as storage/app/themes/default.json.backup:
     * the picker ignores it, and outside resources/ the Vite dev server doesn't reload the
     * page when it changes. Copy it back over default.json to restore.
     *
     * @param  array{theme?: array<string, string>, light?: array<string, string>, dark?: array<string, string>}  $cssVars
     */
    public static function replaceDefault(array $cssVars): void
    {
        $defaultPath = static::getBundleThemePath('default');
        /** @var array<string, mixed> $default */
        $default = json_decode((string) file_get_contents($defaultPath), true);

        self::ensureUserThemesDir();
        copy($defaultPath, static::getUserThemesDir().'/default.json.backup');
        file_put_contents(
            $defaultPath,
            // Merged, so vars the editor doesn't manage (e.g. destructive-foreground) stay.
            json_encode([...$default, 'cssVars' => array_replace_recursive($default['cssVars'] ?? [], $cssVars)], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n",
        );
    }

    /**
     * Patch a theme into resources/css/theme.css: `theme` + `light` vars into `:root`,
     * `dark` vars into `.dark`, and optional `@layer base` rules.
     *
     * @param  array{theme?: array<string, string>, light?: array<string, string>, dark?: array<string, string>}  $cssVars
     * @param  array<string, array<string, string>>  $layerBase
     * @return array{light: int, dark: int} Number of vars patched per block
     *
     * @throws RuntimeException When there is nothing to apply or theme.css can't be read
     */
    public static function applyToCss(array $cssVars, array $layerBase = []): array
    {
        $light = self::prefixKeys(array_merge($cssVars['theme'] ?? [], $cssVars['light'] ?? []));
        $dark = self::prefixKeys($cssVars['dark'] ?? []); // theme vars belong in :root only, not .dark

        if (empty($light) && empty($dark)) {
            throw new RuntimeException('Invalid theme: no CSS variables found');
        }

        $themeCssPath = resource_path('css/theme.css');
        $css = file_exists($themeCssPath) ? file_get_contents($themeCssPath) : false;

        if ($css === false) {
            throw new RuntimeException("Could not read theme.css at: {$themeCssPath}");
        }

        if (! empty($light)) {
            $css = self::patchBlock($css, ':root', $light);
        }

        if (! empty($dark)) {
            $css = self::patchBlock($css, '.dark', $dark);
        }

        if (! empty($layerBase)) {
            $css = self::patchLayerBase($css, self::renderLayerBase($layerBase));
        }

        file_put_contents($themeCssPath, $css);

        return ['light' => count($light), 'dark' => count($dark)];
    }

    /**
     * `background` → `--background`, the form theme.css declares them in.
     *
     * @param  array<string, string>  $vars
     * @return array<string, string>
     */
    private static function prefixKeys(array $vars): array
    {
        return collect($vars)->mapWithKeys(fn (string $value, string $key): array => ['--'.$key => $value])->all();
    }

    /**
     * Patch specific CSS variables inside a top-level selector block (e.g. :root or .dark).
     * Existing vars are updated in-place; new vars are appended before the closing brace.
     * Note: [^{}]* intentionally rejects nested braces — theme.css :root/.dark blocks are flat.
     *
     * @param  array<string, string>  $vars
     */
    private static function patchBlock(string $css, string $selector, array $vars): string
    {
        $pattern = '/'.preg_quote($selector, '/').'\s*\{([^{}]*)\}/s';

        return preg_replace_callback($pattern, function (array $matches) use ($vars): string {
            $block = $matches[1];

            foreach ($vars as $variable => $value) {
                $varPattern = '/'.preg_quote($variable, '/').'\s*:[^;]+;/';
                $replacement = "{$variable}: {$value};";

                if (preg_match($varPattern, $block)) {
                    // A callback, so `$1` or `\1` in a value is written as-is, not as a backreference.
                    $block = (string) preg_replace_callback($varPattern, fn (): string => $replacement, $block);
                } else {
                    $block = rtrim($block)."\n    {$replacement}\n";
                }
            }

            return str_replace($matches[1], $block, $matches[0]);
        }, $css) ?? $css;
    }

    /**
     * @param  array<string, array<string, string>>  $rules
     */
    private static function renderLayerBase(array $rules): string
    {
        $lines = [];
        foreach ($rules as $selector => $properties) {
            $lines[] = "    {$selector} {";
            foreach ($properties as $property => $value) {
                $lines[] = "        {$property}: {$value};";
            }
            $lines[] = '    }';
        }

        return implode("\n", $lines);
    }

    private static function patchLayerBase(string $css, string $content): string
    {
        $pattern = '/@layer\s+base\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s';
        $block = "@layer base {\n{$content}\n}";

        if (preg_match($pattern, $css)) {
            return (string) preg_replace($pattern, $block, $css);
        }

        return rtrim($css)."\n\n{$block}\n";
    }
}
