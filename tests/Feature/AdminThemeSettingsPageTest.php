<?php

namespace Modules\Themes\Tests\Feature;

use App\Enums\Role;
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
        $admin->assignRole(Role::ADMIN);

        $this->actingAs($admin);
    }

    public function test_an_admin_saves_the_admin_theme(): void
    {
        $this->actingAsAdmin();

        Livewire::test(AdminThemeSettingsPage::class)
            ->fillForm([
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
        $user->assignRole(Role::USER);

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
