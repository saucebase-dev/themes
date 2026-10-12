<?php

namespace Modules\Themes\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Themes\Database\Seeders\DatabaseSeeder;
use Modules\Themes\Filament\Pages\AdminThemeSettings;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * The admin theme settings page is its own permission, so a role can be given it and nothing else in the
 * panel. `access admin panel` alone only opens the door.
 */
class ThemesPermissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
    }

    public function test_the_seeder_creates_the_permission(): void
    {
        $this->assertTrue(Permission::where('name', 'manage themes')->exists());
    }

    public function test_a_user_with_the_permission_can_open_it(): void
    {
        $this->actingAs($this->staff('access admin panel', 'manage themes'))
            ->get(AdminThemeSettings::getUrl())
            ->assertOk();
    }

    public function test_panel_access_alone_does_not_open_it(): void
    {
        $this->actingAs($this->staff('access admin panel'))
            ->get(AdminThemeSettings::getUrl())
            ->assertForbidden();
    }

    private function staff(string ...$permissions): User
    {
        Permission::findOrCreate('access admin panel');

        return User::factory()->create(['email_verified_at' => now()])->givePermissionTo($permissions);
    }
}
