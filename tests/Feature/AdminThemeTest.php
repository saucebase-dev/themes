<?php

namespace Modules\Themes\Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Filament\Facades\Filament;
use Filament\Support\Colors\Color;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
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
        $admin->assignRole(Role::ADMIN);

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

        $this->assertSame(Color::generatePalette('#6366f1'), $colors['primary']);
        $this->assertSame(Color::generatePalette('#e11d48'), $colors['danger']);
    }

    public function test_a_font_reaches_the_panel(): void
    {
        $this->saveSettings(['font' => 'Lexend']);

        $this->assertSame('Lexend', Filament::getPanel('admin')->getFontFamily());
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
