<?php

namespace Modules\Themes\Filament\Pages;

use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\ColorPicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Modules\Themes\Admin\AdminTheme;
use Modules\Themes\Services\ThemeService;
use Modules\Themes\Settings\AdminThemeSettings as Settings;
use Saucebase\Core\Filament\Pages\SettingsPage;

/**
 * The admin panel's own look. Empty fields keep Filament's defaults; a save applies on
 * the next page load, with no build step.
 */
class AdminThemeSettings extends SettingsPage
{
    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedSwatch;

    protected static ?int $navigationSort = 20;

    protected static string $settings = Settings::class;

    public static function canAccess(): bool
    {
        return auth()->user()?->can('manage themes') ?? false;
    }

    public static function getNavigationLabel(): string
    {
        return __('Admin theme');
    }

    public function getTitle(): string
    {
        return __('Admin Theme');
    }

    public function form(Schema $schema): Schema
    {
        return $schema->columns(1)->components([
            Section::make(__('Colours'))
                ->description(__('One colour each; the full shade range is generated from it. Leave empty for the default.'))
                ->icon(Heroicon::OutlinedSwatch)
                ->schema([
                    Grid::make(2)->schema([
                        $this->colorField('primary', __('Primary'), __('Buttons, links and active items.')),
                        $this->colorField('gray', __('Base'), __('Backgrounds, borders and text.')),
                    ]),
                    Grid::make(4)->schema([
                        $this->colorField('danger', __('Danger'), __('Errors and destructive actions.')),
                        $this->colorField('warning', __('Warning'), __('Warnings and pending states.')),
                        $this->colorField('success', __('Success'), __('Confirmations and completed states.')),
                        $this->colorField('info', __('Info'), __('Neutral notices and hints.')),
                    ]),
                ]),

            Section::make(__('Typography and shape'))
                ->icon(Heroicon::OutlinedAdjustmentsHorizontal)
                ->schema([
                    Select::make('font')
                        ->label(__('Font'))
                        ->options($this->fontOptions())
                        ->in(array_keys($this->fontOptions()))
                        ->searchable()
                        ->placeholder(__('Default (Inter)'))
                        ->extraAttributes(['data-testid' => 'admin-theme-font']),
                    TextInput::make('radius')
                        ->label(__('Corner radius'))
                        ->placeholder('0.5rem')
                        ->helperText(__('A CSS length in px, rem or em. Leave empty for the default.'))
                        ->regex(AdminTheme::RADIUS_PATTERN)
                        ->extraAttributes(['data-testid' => 'admin-theme-radius']),
                ])
                ->columns(2),
        ]);
    }

    /** @return array<Action> */
    protected function getHeaderActions(): array
    {
        return [
            Action::make('reset')
                ->label(__('Reset to defaults'))
                ->color('gray')
                ->requiresConfirmation()
                ->action(function (): void {
                    $settings = app(Settings::class);
                    foreach ([...AdminTheme::COLORS, 'font', 'radius'] as $property) {
                        $settings->{$property} = null;
                    }
                    $settings->save();

                    Notification::make()->title(__('Admin theme reset'))->success()->send();

                    $this->reloadPage();
                }),
        ];
    }

    /**
     * The theme is written into the page <head>, which Filament's SPA navigation never
     * re-renders, so a change only shows after a real reload.
     */
    protected function afterSave(): void
    {
        $this->reloadPage();
    }

    private function reloadPage(): void
    {
        $this->redirect(static::getUrl(), navigate: false);
    }

    private function colorField(string $name, string $label, string $helperText): ColorPicker
    {
        return ColorPicker::make($name)
            ->label($label)
            ->helperText($helperText)
            ->extraAttributes(['data-testid' => "admin-theme-{$name}"]);
    }

    /** @return array<string, string> family => family, from the module's font lists */
    private function fontOptions(): array
    {
        return collect(['sans', 'serif', 'mono'])
            ->flatMap(fn (string $category): array => ThemeService::loadFonts($category))
            ->pluck('family', 'family')
            ->sort()
            ->all();
    }
}
