<?php

namespace Modules\Themes\Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DemoThemesDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // A staff account that sees only this module's admin area.
        Role::findOrCreate('themes admin')->syncPermissions(['access admin panel', 'manage themes']);
        $staff = User::firstOrCreate(
            ['email' => 'themes@saucebase.dev'],
            ['name' => 'Themes Admin', 'password' => bcrypt('secretsauce')],
        );
        $staff->syncRoles('themes admin');
    }
}
