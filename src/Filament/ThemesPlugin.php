<?php

namespace Modules\Themes\Filament;

use Filament\Contracts\Plugin;
use Filament\Panel;
use Saucebase\Core\Filament\ModulePlugin;

class ThemesPlugin implements Plugin
{
    use ModulePlugin;

    public function getModuleName(): string
    {
        return 'Themes';
    }

    public function getId(): string
    {
        return 'themes';
    }

    public function boot(Panel $panel): void
    {
        //
    }
}
