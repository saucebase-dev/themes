<?php

namespace Modules\Themes\Filament;

use Filament\Contracts\Plugin;
use Filament\Panel;
use Filament\View\PanelsRenderHook;
use Illuminate\Support\HtmlString;
use Modules\Themes\Admin\AdminTheme;
use Modules\Themes\Settings\AdminThemeSettings;
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

    /**
     * Settings are read in closures, at request time: the panel is configured during
     * boot, before a console command or a fresh install has a settings table.
     */
    public function afterRegister(Panel $panel): void
    {
        $panel
            ->colors(fn (): array => AdminTheme::palettes($this->settings()->toArray()))
            ->font(fn (): ?string => $this->settings()->font)
            ->renderHook(PanelsRenderHook::HEAD_END, function (): ?HtmlString {
                $css = AdminTheme::radiusCss($this->settings()->radius);

                return $css === null ? null : new HtmlString("<style>{$css}</style>");
            });
    }

    private function settings(): AdminThemeSettings
    {
        return app(AdminThemeSettings::class);
    }
}
