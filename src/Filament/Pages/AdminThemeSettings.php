<?php

namespace Modules\Themes\Filament\Pages;

use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\ColorPicker;
use Filament\Forms\Components\Radio;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Filament\Support\Colors\Color;
use Filament\Support\Icons\Heroicon;
use Illuminate\Support\HtmlString;
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

    /** Last under Settings, after API tokens (90) and Coming Soon (100). */
    protected static ?int $navigationSort = 110;

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
        $custom = fn (Get $get): bool => $get('palette') === 'custom';

        return $schema->columns(1)->components([
            Section::make(__('Palette'))
                ->description(__('Pick a ready-made palette, or Custom to choose each colour.'))
                ->icon(Heroicon::OutlinedSwatch)
                ->schema([
                    Radio::make('palette')
                        ->hiddenLabel()
                        ->options($this->paletteOptions())
                        ->inline()
                        ->required()
                        ->live()
                        ->extraAttributes(['data-testid' => 'admin-theme-palette']),
                ]),

            Section::make(__('Colours'))
                ->description(__('One colour each; the full shade range is generated from it. Leave empty for the default.'))
                ->icon(Heroicon::OutlinedSwatch)
                ->visible($custom)
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

    /**
     * Each palette as a small swatch of its colours over its name, like a sidebar preview.
     *
     * @return array<string, HtmlString>
     */
    private function paletteOptions(): array
    {
        // Each theme's own sidebar with its primary on it. Inline styles, since Filament's
        // compiled CSS has no classes for markup it doesn't ship. Borders mix `currentColor`
        // so they show in light and dark mode alike.
        $box = 'display:flex;flex-direction:column;gap:0.25rem;width:5rem;height:2.75rem;padding:0.375rem;border-radius:0.375rem;border:1px solid color-mix(in srgb, currentColor 20%, transparent);';
        $swatch = fn (string $label, string $primary, string $gray): HtmlString => new HtmlString(sprintf(
            '<span style="display:inline-flex;flex-direction:column;gap:0.25rem"><span style="%4$sbackground:%2$s"><span style="width:2.5rem;height:0.5rem;border-radius:0.125rem;background:%1$s"></span><span style="width:3.25rem;height:0.375rem;border-radius:0.125rem;background:color-mix(in oklch, %1$s 25%%, %2$s)"></span></span><span>%3$s</span></span>',
            e($primary), e($gray), e($label), $box,
        ));

        return [
            // No colours: the panel's own (zinc in the app's AdminPanelProvider).
            'default' => $swatch(__('Neutral'), Color::Zinc[700], Color::Zinc[100]),
            ...array_map(fn (array $preset): HtmlString => $swatch($preset['label'], $preset['primary'], $preset['gray']), static::presets()),
            'custom' => new HtmlString(sprintf(
                '<span style="display:inline-flex;flex-direction:column;gap:0.25rem"><span style="%sborder-style:dashed;border-color:color-mix(in srgb, currentColor 45%%, transparent);align-items:center;justify-content:center;font-size:0.75rem">%s</span><span>%s</span></span>',
                $box, e(__('Your own')), e(__('Custom')),
            )),
        ];
    }

    /**
     * The app's shipped themes as admin palettes, so the admin can match the app: each
     * theme's light primary, and its sidebar as the base. A theme added later shows up too.
     *
     * @return array<string, array{label: string, primary: string, gray: string}>
     */
    public static function presets(): array
    {
        return once(fn (): array => collect(glob(ThemeService::getBundleThemesDir().'/*.json') ?: [])
            ->mapWithKeys(function (string $file): array {
                $theme = json_decode((string) file_get_contents($file), true);
                $light = $theme['cssVars']['light'] ?? [];
                $gray = $light['sidebar'] ?? $light['background'] ?? null;

                if (! isset($theme['name'], $light['primary']) || $gray === null) {
                    return [];
                }

                // `default` is this page's own option (no colours), so the app's default
                // theme gets a key and a label of its own.
                $isDefault = $theme['name'] === 'default';

                return [($isDefault ? 'app-default' : $theme['name']) => [
                    'label' => $isDefault ? __('App default') : ($theme['title'] ?? $theme['name']),
                    'primary' => $light['primary'],
                    'gray' => $gray,
                ]];
            })
            ->sortBy('label')
            ->all());
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeFill(array $data): array
    {
        return [...$data, 'palette' => AdminTheme::presetFor($data, static::presets())];
    }

    /**
     * A preset (or Default) sets every colour; Custom keeps what was picked. The palette
     * itself is not stored: the page reads it back from the colours.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeSave(array $data): array
    {
        $palette = $data['palette'] ?? 'custom';
        unset($data['palette']);

        return $palette === 'custom' ? $data : [...$data, ...AdminTheme::presetColors($palette, static::presets())];
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
