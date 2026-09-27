<?php

namespace Modules\Themes\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Saucebase\Core\Services\FrontendConfig;
use Tests\TestCase;

class ThemesAccessTest extends TestCase
{
    use RefreshDatabase;

    private string $storageDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->storageDir = storage_path('app/themes');

        app()->bind(FrontendConfig::class, fn () => new class extends FrontendConfig
        {
            public function getFramework(): string
            {
                return 'vue';
            }
        });
    }

    protected function tearDown(): void
    {
        foreach (glob($this->storageDir.'/test-*.json') ?: [] as $file) {
            unlink($file);
        }

        parent::tearDown();
    }

    /** @return array<string, mixed> */
    private function payload(string $name = 'test-access'): array
    {
        return [
            'name' => $name,
            'title' => 'Test Access',
            'cssVars' => ['light' => ['primary' => 'red'], 'dark' => ['primary' => 'blue']],
        ];
    }

    private function createUserTheme(string $name = 'test-access'): void
    {
        if (! is_dir($this->storageDir)) {
            mkdir($this->storageDir, 0755, true);
        }
        file_put_contents($this->storageDir."/{$name}.json", json_encode($this->payload($name)));
    }

    public function test_writes_are_off_by_default_outside_local(): void
    {
        $this->assertFalse(config('themes.writable'));
        $this->assertFalse(config('themes.enabled'));
    }

    public function test_write_routes_do_not_exist_when_not_writable(): void
    {
        config(['themes.writable' => false]);
        $this->createUserTheme();

        $this->postJson(route('themes.store'), $this->payload('test-new'))->assertNotFound();
        $this->putJson(route('themes.update', ['name' => 'test-access']), $this->payload())->assertNotFound();
        $this->deleteJson(route('themes.destroy', ['name' => 'test-access']))->assertNotFound();

        $this->assertFileDoesNotExist($this->storageDir.'/test-new.json');
        $this->assertFileExists($this->storageDir.'/test-access.json');
    }

    public function test_write_routes_work_when_writable(): void
    {
        config(['themes.writable' => true]);

        $this->postJson(route('themes.store'), $this->payload())->assertOk();
        $this->putJson(route('themes.update', ['name' => 'test-access']), $this->payload())->assertOk();
        $this->deleteJson(route('themes.destroy', ['name' => 'test-access']))->assertOk();
    }

    public function test_update_and_destroy_are_throttled(): void
    {
        config(['themes.writable' => true]);

        for ($i = 0; $i < 30; $i++) {
            $this->deleteJson(route('themes.destroy', ['name' => 'test-missing']));
        }

        $this->deleteJson(route('themes.destroy', ['name' => 'test-missing']))->assertTooManyRequests();
        $this->putJson(route('themes.update', ['name' => 'test-missing']), $this->payload())->assertTooManyRequests();
    }

    public function test_oversized_css_vars_are_rejected(): void
    {
        config(['themes.writable' => true]);
        $payload = $this->payload();
        $payload['cssVars']['light'] = array_fill_keys(array_map(fn ($i) => "var-{$i}", range(1, 101)), 'red');
        $payload['cssVars']['dark'] = ['primary' => str_repeat('a', 256)];

        $this->postJson(route('themes.store'), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cssVars.light', 'cssVars.dark.primary']);
    }

    public function test_can_save_is_shared_to_the_panel(): void
    {
        config(['themes.enabled' => true, 'themes.writable' => false]);
        $this->get('/')->assertInertia(fn ($page) => $page->where('themes.canSave', false));

        config(['themes.writable' => true]);
        $this->get('/')->assertInertia(fn ($page) => $page->where('themes.canSave', true));
    }
}
