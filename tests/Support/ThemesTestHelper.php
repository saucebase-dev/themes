<?php

namespace Modules\Themes\Tests\Support;

use Modules\Themes\Services\ThemeService;
use RuntimeException;

class ThemesTestHelper
{
    public static function cleanUserThemes(): void
    {
        $dir = storage_path('app/themes');

        if (! is_dir($dir)) {
            return;
        }

        foreach (glob("{$dir}/*.json") as $file) {
            unlink($file);
        }
    }

    public static function setEnabled(bool $enabled): void
    {
        config(['themes.enabled' => $enabled]);
    }

    public static function resetConfig(): void
    {
        config([
            'themes.enabled' => true,
        ]);
    }

    /**
     * Copy the files "Set as default" rewrites, so an E2E run can put them back.
     */
    public static function snapshotDefault(): void
    {
        $dir = self::snapshotDir();
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        foreach (self::defaultFiles() as $name => $path) {
            if (is_file($path) && ! copy($path, "{$dir}/{$name}")) {
                throw new RuntimeException("Could not snapshot {$path}");
            }
        }
    }

    /**
     * Restore what snapshotDefault() copied, including a backup that existed before.
     */
    public static function restoreDefault(): void
    {
        $dir = self::snapshotDir();

        // A file missing from the snapshot didn't exist before the run: remove it.
        foreach (self::defaultFiles() as $name => $path) {
            if (is_file("{$dir}/{$name}")) {
                if (! copy("{$dir}/{$name}", $path)) {
                    throw new RuntimeException("Could not restore {$path}; the snapshot is kept in {$dir}");
                }
                unlink("{$dir}/{$name}");
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }

    /** @return array<string, string> */
    private static function defaultFiles(): array
    {
        return [
            'theme.css' => resource_path('css/theme.css'),
            'default.json' => module_path('Themes', 'resources/themes/default.json'),
            'default.json.backup' => ThemeService::getUserThemesDir().'/default.json.backup',
        ];
    }

    private static function snapshotDir(): string
    {
        return storage_path('app/themes-e2e-snapshot');
    }
}
