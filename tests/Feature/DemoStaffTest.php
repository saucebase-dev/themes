<?php

namespace Modules\Themes\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Themes\Database\Seeders\DatabaseSeeder;
use Modules\Themes\Database\Seeders\DemoThemesDatabaseSeeder;
use Tests\TestCase;

/**
 * The demo ships a staff account for this module's admin area, so visitors can try a
 * role that sees only part of the panel.
 */
class DemoStaffTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_demo_adds_a_staff_account_for_this_module_only(): void
    {
        $this->seed([DatabaseSeeder::class, DemoThemesDatabaseSeeder::class]);

        $staff = User::where('email', 'themes@saucebase.dev')->firstOrFail();

        $this->assertSame(['themes admin'], $staff->getRoleNames()->all());
        $this->assertEqualsCanonicalizing(['access admin panel', 'manage themes'], $staff->getAllPermissions()->pluck('name')->all());
    }
}
