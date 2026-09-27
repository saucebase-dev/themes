<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        foreach (['primary', 'gray', 'danger', 'warning', 'success', 'info', 'font', 'radius'] as $key) {
            if (! $this->migrator->exists("admin_theme.{$key}")) {
                $this->migrator->add("admin_theme.{$key}", null);
            }
        }
    }
};
