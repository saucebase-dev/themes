<?php

namespace Modules\Themes\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Modules\Themes\Admin\AdminTheme;
use Modules\Themes\Filament\Pages\AdminThemeSettings as AdminThemeSettingsPage;
use Modules\Themes\Settings\AdminThemeSettings;
use Tests\TestCase;

class AdminThemeSettingsPageTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin);
    }

    /** A palette fills the colours in one click; nothing new is stored but the colours. */
    public function test_picking_a_palette_saves_its_colours(): void
    {
        $this->actingAsAdmin();
        $preset = AdminThemeSettingsPage::presets()['coffee'];
        $key = 'coffee';

        Livewire::test(AdminThemeSettingsPage::class)
            ->fillForm(['palette' => $key])
            ->assertFormFieldHidden('primary')
            ->call('save')
            ->assertHasNoFormErrors();

        $settings = new AdminThemeSettings;
        $this->assertSame($preset['primary'], $settings->primary);
        $this->assertSame($preset['gray'], $settings->gray);
        $this->assertNull($settings->danger);
    }

    /** The page reads which palette the stored colours are: a match, the default, or custom. */
    public function test_the_page_recognises_the_saved_palette(): void
    {
        $this->actingAsAdmin();
        $settings = app(AdminThemeSettings::class);

        Livewire::test(AdminThemeSettingsPage::class)->assertFormSet(['palette' => 'default']);

        $key = 'kiwi';
        $settings->primary = AdminThemeSettingsPage::presets()[$key]['primary'];
        $settings->gray = AdminThemeSettingsPage::presets()[$key]['gray'];
        $settings->save();
        Livewire::test(AdminThemeSettingsPage::class)->assertFormSet(['palette' => $key]);

        $settings->danger = '#000000';
        $settings->save();
        Livewire::test(AdminThemeSettingsPage::class)
            ->assertFormSet(['palette' => 'custom'])
            ->assertFormFieldVisible('primary');
    }

    /** The palettes are the app's own themes, so the admin can match the app. */
    public function test_the_palettes_are_the_shipped_themes(): void
    {
        $presets = AdminThemeSettingsPage::presets();

        $this->assertSame('Coffee', $presets['coffee']['label']);
        $this->assertSame('oklch(0.50 0.08 43)', $presets['coffee']['primary']);
        $this->assertSame('oklch(0.92 0.030 78)', $presets['coffee']['gray']);
        $this->assertArrayHasKey('kiwi', $presets);
        // The app's default theme can't take `default`, the page's no-colour option.
        $this->assertSame('App default', $presets['app-default']['label']);
        $this->assertArrayNotHasKey('default', $presets);
    }

    public function test_the_default_palette_clears_the_colours(): void
    {
        $this->actingAsAdmin();
        $settings = app(AdminThemeSettings::class);
        $settings->primary = '#123456';
        $settings->save();

        Livewire::test(AdminThemeSettingsPage::class)
            ->fillForm(['palette' => 'default'])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertNull((new AdminThemeSettings)->primary);
    }

    public function test_an_admin_saves_the_admin_theme(): void
    {
        $this->actingAsAdmin();

        Livewire::test(AdminThemeSettingsPage::class)
            ->fillForm([
                'palette' => 'custom',
                'primary' => '#6366f1',
                'danger' => '#e11d48',
                'font' => 'DM Sans',
                'radius' => '0.5rem',
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $settings = new AdminThemeSettings;
        $this->assertSame('#6366f1', $settings->primary);
        $this->assertSame('#e11d48', $settings->danger);
        $this->assertNull($settings->gray);
        $this->assertSame('DM Sans', $settings->font);
        $this->assertSame('0.5rem', $settings->radius);
    }

    public function test_reset_restores_every_default(): void
    {
        $this->actingAsAdmin();
        $settings = app(AdminThemeSettings::class);
        $settings->primary = '#6366f1';
        $settings->font = 'DM Sans';
        $settings->radius = '1rem';
        $settings->save();

        Livewire::test(AdminThemeSettingsPage::class)
            ->callAction('reset');

        $settings = new AdminThemeSettings;
        $this->assertNull($settings->primary);
        $this->assertNull($settings->font);
        $this->assertNull($settings->radius);
    }

    /** The radius is printed into a <style> tag, so only a plain CSS length gets through. */
    public function test_a_radius_that_is_not_a_css_length_is_rejected(): void
    {
        $this->actingAsAdmin();

        Livewire::test(AdminThemeSettingsPage::class)
            ->fillForm(['radius' => '1rem; } </style><script>alert(1)</script>'])
            ->call('save')
            ->assertHasFormErrors(['radius']);

        $this->assertNull(AdminTheme::radiusCss('1rem; } </style><script>'));
    }

    public function test_a_font_outside_the_list_is_rejected(): void
    {
        $this->actingAsAdmin();

        Livewire::test(AdminThemeSettingsPage::class)
            ->fillForm(['font' => 'Not A Real Font'])
            ->call('save')
            ->assertHasFormErrors(['font']);
    }

    public function test_only_admins_reach_the_page(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');

        $this->actingAs($user)
            ->get(AdminThemeSettingsPage::getUrl())
            ->assertForbidden();
    }

    /**
     * The theme lives in the page <head>, which Filament's SPA navigation never
     * re-renders, so saving must reload the page for real.
     */
    public function test_saving_reloads_the_page_instead_of_navigating(): void
    {
        $this->actingAsAdmin();

        $page = Livewire::test(AdminThemeSettingsPage::class)
            ->fillForm(['primary' => '#6366f1'])
            ->call('save')
            ->assertRedirect(AdminThemeSettingsPage::getUrl());

        $this->assertFalse($page->effects['redirectUsingNavigate'] ?? false);
    }

    public function test_reset_reloads_the_page_instead_of_navigating(): void
    {
        $this->actingAsAdmin();

        $page = Livewire::test(AdminThemeSettingsPage::class)
            ->callAction('reset')
            ->assertRedirect(AdminThemeSettingsPage::getUrl());

        $this->assertFalse($page->effects['redirectUsingNavigate'] ?? false);
    }
}
