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

    /**
     * The palette the colours are: a preset's key, `default` with none set, else `custom`.
     *
     * @param  array<string, ?string>  $colors  keyed by Filament colour name
     * @param  array<string, array{primary: string, gray: string}>  $presets
     */
    public static function presetFor(array $colors, array $presets): string
    {
        $set = array_filter(array_intersect_key($colors, array_flip(self::COLORS)));

        if ($set === []) {
            return 'default';
        }

        foreach ($presets as $key => $preset) {
            if ($set === ['primary' => $preset['primary'], 'gray' => $preset['gray']]) {
                return $key;
            }
        }

        return 'custom';
    }

    /**
     * Every colour a palette sets: the preset's, null for the rest (and all null for `default`).
     *
     * @param  array<string, array{primary: string, gray: string}>  $presets
     * @return array<string, ?string>
     */
    public static function presetColors(string $palette, array $presets): array
    {
        $preset = $presets[$palette] ?? [];

        return array_combine(self::COLORS, array_map(fn (string $color): ?string => $preset[$color] ?? null, self::COLORS));
    }

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
            ->map(fn (string $color): array => self::generate($color))
            ->all();
    }

    /**
     * A palette in the colour's hue and saturation, on the shade curve of Filament's
     * hand-tuned Indigo. `generatePalette()` keeps only the hue, with a fixed vivid chroma
     * and a light 600, so a muted brown or a tinted grey came out vivid and buttons pale.
     * Each shade's chroma is Indigo's, scaled by how saturated the colour is against
     * Indigo's 500.
     *
     * @return array<int, string>
     */
    public static function generate(string $color): array
    {
        [, $chroma, $hue] = self::oklch(Color::convertToOklch($color));
        [, $reference] = self::oklch(Color::Indigo[500]);
        // Capped so a loud colour stays usable.
        $scale = min($chroma / $reference, 1.5);

        return array_map(function (string $shade) use ($scale, $hue): string {
            [$lightness, $curve] = self::oklch($shade);

            return sprintf('oklch(%s %s %s)', round($lightness, 4), round($curve * $scale, 4), round($hue, 4));
        }, Color::Indigo);
    }

    /**
     * Lightness, chroma and hue, with lightness read as written: `0.52` or `52%`.
     *
     * @return array{float, float, float}
     */
    private static function oklch(string $color): array
    {
        preg_match('/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/', $color, $parts);

        return [
            (float) ($parts[1] ?? 0) / (($parts[2] ?? '') === '%' ? 100 : 1),
            (float) ($parts[3] ?? 0),
            (float) ($parts[4] ?? 0),
        ];
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
