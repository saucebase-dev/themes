<?php

namespace Modules\Themes\Tests\Feature;

use App\Models\User;
use Filament\Facades\Filament;
use Filament\FontProviders\BunnyFontProvider;
use Filament\FontProviders\LocalFontProvider;
use Filament\Support\Colors\Color;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Modules\Themes\Admin\AdminTheme;
use Modules\Themes\Settings\AdminThemeSettings;
use Tests\TestCase;

/**
 * The admin theme is read at request time from settings: nothing to build, and an
 * empty setting leaves Filament's own default in place.
 */
class AdminThemeTest extends TestCase
{
    use RefreshDatabase;

    private function saveSettings(array $values): void
    {
        $settings = app(AdminThemeSettings::class);
        foreach ($values as $key => $value) {
            $settings->{$key} = $value;
        }
        $settings->save();
    }

    private function visitAdmin(): TestResponse
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $this->actingAs($admin)->get('/admin');
    }

    public function test_empty_settings_keep_the_panel_defaults(): void
    {
        $panel = Filament::getPanel('admin');

        $this->assertSame(Color::Zinc, $panel->getColors()['primary']);
        $this->assertArrayNotHasKey('danger', $panel->getColors());
        $this->assertSame('Inter Variable', $panel->getFontFamily());
    }

    public function test_a_base_colour_becomes_the_panel_palette(): void
    {
        $this->saveSettings(['primary' => '#6366f1', 'danger' => '#e11d48']);

        $colors = Filament::getPanel('admin')->getColors();

        $this->assertSame(AdminTheme::palettes(['primary' => '#6366f1'])['primary'], $colors['primary']);
        $this->assertCount(11, $colors['danger']);
    }

    /**
     * The shades keep the colour's own saturation: Filament's generator keeps only the hue,
     * so a muted brown or a faintly tinted grey would come out vivid.
     */
    public function test_a_muted_colour_stays_muted(): void
    {
        $chroma = fn (string $shade): float => sscanf($shade, 'oklch(%f %f %f)')[1];

        $coffee = AdminTheme::palettes(['primary' => 'oklch(0.50 0.08 43)'])['primary'];
        $this->assertEqualsWithDelta(0.08, $chroma($coffee[500]), 0.001);

        $tint = AdminTheme::palettes(['gray' => 'oklch(0.96 0.006 85)'])['gray'];
        $this->assertLessThan(0.01, $chroma($tint[500]));
        $this->assertGreaterThan(0, $chroma($tint[500]));
    }

    /** Lightness written as a percentage, as the app's default theme does. */
    public function test_a_percentage_lightness_keeps_its_saturation(): void
    {
        $shade = AdminTheme::palettes(['primary' => 'oklch(52.43% 0.1679 286.902)'])['primary'][500];

        $this->assertEqualsWithDelta(0.1679, sscanf($shade, 'oklch(%f %f %f)')[1], 0.001);
    }

    /** The button shade is dark enough for white text, as Filament's own palettes are. */
    public function test_the_button_shade_is_as_dark_as_filaments_own(): void
    {
        $lightness = fn (string $shade): float => sscanf($shade, 'oklch(%f')[0];
        $mango = AdminTheme::palettes(['primary' => 'oklch(0.75 0.17 68)'])['primary'];

        $this->assertEqualsWithDelta($lightness(Color::Indigo[600]), $lightness($mango[600]), 0.001);
    }

    public function test_a_font_reaches_the_panel(): void
    {
        $this->saveSettings(['font' => 'Lexend']);

        $this->assertSame('Lexend', Filament::getPanel('admin')->getFontFamily());
    }

    public function test_no_font_keeps_the_font_filament_ships(): void
    {
        // Served from the application, not fetched from a font CDN.
        $this->assertSame(LocalFontProvider::class, Filament::getPanel('admin')->getFontProvider());

        $this->saveSettings(['font' => 'Lexend']);

        $this->assertSame(BunnyFontProvider::class, Filament::getPanel('admin')->getFontProvider());
    }

    public function test_a_radius_reaches_the_rendered_page(): void
    {
        $this->saveSettings(['radius' => '0.5rem']);

        $this->visitAdmin()
            ->assertOk()
            ->assertSee('--radius-lg: 0.5rem', false)
            ->assertSee('--radius-sm: calc(0.5rem - 4px)', false);
    }

    public function test_no_radius_renders_no_override(): void
    {
        $this->visitAdmin()
            ->assertOk()
            ->assertDontSee('--radius-lg:', false);
    }
}
