<?php

namespace Modules\Themes\Admin;

use Filament\Support\Colors\Color;

/**
 * Turns admin theme values into what a Filament panel takes.
 *
 * Depends on Filament only, never on Saucebase, so it can move into a standalone
 * Filament plugin later (themes ADR 0001).
 */
class AdminTheme
{
    public const COLORS = ['primary', 'gray', 'danger', 'warning', 'success', 'info'];

    /** A plain CSS length. The radius is printed into a <style> tag, so nothing else passes. */
    public const RADIUS_PATTERN = '/^\d*\.?\d+(px|rem|em)$/';

    /**
     * @param  array<string, ?string>  $baseColors  keyed by Filament colour name
     * @return array<string, array<int, string>>
     */
    public static function palettes(array $baseColors): array
    {
        return collect($baseColors)
            ->only(self::COLORS)
            ->filter()
            ->map(fn (string $color): array => Color::generatePalette($color))
            ->all();
    }

    /**
     * The radius scale Filament's components read, from one base length.
     * Mirrors the app's `computeRadiusScale()` so both look alike.
     */
    public static function radiusCss(?string $radius): ?string
    {
        if (blank($radius) || ! preg_match(self::RADIUS_PATTERN, $radius)) {
            return null;
        }

        return ':root {'
            ." --radius-sm: calc({$radius} - 4px);"
            ." --radius-md: calc({$radius} - 2px);"
            ." --radius-lg: {$radius};"
            ." --radius-xl: calc({$radius} + 4px);"
            ." --radius-2xl: calc({$radius} + 8px);"
            .' }';
    }
}
