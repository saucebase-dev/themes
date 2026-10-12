<?php

namespace Modules\Themes\Settings;

use Spatie\LaravelSettings\Settings;

/**
 * The Filament admin's look. Every value is optional: null leaves Filament's (or the
 * app panel's) own default in place.
 */
class AdminThemeSettings extends Settings
{
    /** Base colours, any CSS colour Filament can parse; each becomes a 50–950 palette. */
    public ?string $primary;

    public ?string $gray;

    public ?string $danger;

    public ?string $warning;

    public ?string $success;

    public ?string $info;

    /** Font family name, loaded through Filament's font provider. */
    public ?string $font;

    /** Base corner radius as a CSS length, e.g. `0.5rem`. */
    public ?string $radius;

    public static function group(): string
    {
        return 'admin_theme';
    }
}
