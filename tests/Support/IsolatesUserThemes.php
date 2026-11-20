<?php

namespace Modules\Themes\Tests\Support;

use Illuminate\Support\Facades\File;

/**
 * Points storage at a temporary directory for the test, so the user themes it reads and
 * writes are its own: an app's own themes (a template ships a `default.json`) neither change
 * what the test sees nor get overwritten by it. Laravel calls both hooks by the trait's name.
 */
trait IsolatesUserThemes
{
    private string $isolatedStorage;

    protected function setUpIsolatesUserThemes(): void
    {
        $this->isolatedStorage = sys_get_temp_dir().'/themes-test-'.bin2hex(random_bytes(6));
        $this->app->useStoragePath($this->isolatedStorage);
    }

    protected function tearDownIsolatesUserThemes(): void
    {
        File::deleteDirectory($this->isolatedStorage);
    }
}
