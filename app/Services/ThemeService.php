<?php

namespace Modules\Themes\Services;

interface ThemeService
{
    const THEME_FILE = 'resources/css/theme.css';

    public static function exists(): bool;

    public static function get(): array|false;
}
