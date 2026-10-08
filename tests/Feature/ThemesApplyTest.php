<?php

namespace Modules\Themes\Tests\Feature;

use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Themes\Services\ThemeService;
use Saucebase\Core\FrontendConfig;
use Tests\TestCase;

class ThemesApplyTest extends TestCase
{
    use RefreshDatabase;

    private string $themeCssPath;

    private string $originalCss;

    private string $defaultJsonPath;

    private string $backupJsonPath;

    private string $originalDefaultJson;

    /** A backup that existed before the test, kept so the test doesn't destroy it. */
    private ?string $originalBackup = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->themeCssPath = resource_path('css/theme.css');
        $this->originalCss = (string) file_get_contents($this->themeCssPath);
        $this->defaultJsonPath = module_path('Themes', 'resources/themes/default.json');
        $this->backupJsonPath = ThemeService::getUserThemesDir().'/default.json.backup';
        $this->originalDefaultJson = (string) file_get_contents($this->defaultJsonPath);
        $this->originalBackup = is_file($this->backupJsonPath) ? (string) file_get_contents($this->backupJsonPath) : null;

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
        file_put_contents($this->themeCssPath, $this->originalCss);
        file_put_contents($this->defaultJsonPath, $this->originalDefaultJson);
        if ($this->originalBackup !== null) {
            file_put_contents($this->backupJsonPath, $this->originalBackup);
        } else {
            @unlink($this->backupJsonPath);
        }

        parent::tearDown();
    }

    /** Laravel only skips the CSRF check in the `testing` environment, so it's off here explicitly. */
    private function actLocally(): void
    {
        $this->app['env'] = 'local';
        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        return ['cssVars' => [
            'theme' => ['radius' => '0.75rem'],
            'light' => ['primary' => 'oklch(0.1 0.2 30)'],
            'dark' => ['primary' => 'oklch(0.9 0.2 30)'],
        ]];
    }

    public function test_apply_does_not_exist_outside_local(): void
    {
        $this->postJson(route('themes.apply'), $this->payload())->assertNotFound();

        $this->assertSame($this->originalCss, file_get_contents($this->themeCssPath));
    }

    public function test_apply_writes_the_theme_into_theme_css_locally(): void
    {
        $this->actLocally();

        $this->postJson(route('themes.apply'), $this->payload())->assertOk();

        $css = (string) file_get_contents($this->themeCssPath);
        $darkAt = (int) strpos($css, '.dark');
        $this->assertStringContainsString('--primary: oklch(0.1 0.2 30);', substr($css, 0, $darkAt));
        $this->assertStringContainsString('--radius: 0.75rem;', substr($css, 0, $darkAt));
        $this->assertStringContainsString('--primary: oklch(0.9 0.2 30);', substr($css, $darkAt));
    }

    public function test_values_that_would_break_the_css_are_rejected(): void
    {
        $this->actLocally();
        $payload = $this->payload();
        $payload['cssVars']['light']['primary'] = 'red; } body { display: none';

        $this->postJson(route('themes.apply'), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cssVars.light.primary']);
        $this->assertSame($this->originalCss, file_get_contents($this->themeCssPath));
    }

    public function test_can_apply_is_shared_only_locally(): void
    {
        config(['themes.enabled' => true]);
        $this->get('/')->assertInertia(fn ($page) => $page->where('themes.canApply', false));

        $this->actLocally();
        $this->get('/')->assertInertia(fn ($page) => $page->where('themes.canApply', true));
    }

    public function test_setting_a_default_updates_default_json_and_backs_up_the_previous_one(): void
    {
        $this->actLocally();
        $original = json_decode($this->originalDefaultJson, true);

        $this->postJson(route('themes.apply'), $this->payload())->assertOk();

        $default = json_decode((string) file_get_contents($this->defaultJsonPath), true);
        $this->assertSame('oklch(0.1 0.2 30)', $default['cssVars']['light']['primary']);
        $this->assertSame('oklch(0.9 0.2 30)', $default['cssVars']['dark']['primary']);
        $this->assertSame('0.75rem', $default['cssVars']['theme']['radius']);
        $this->assertSame('default', $default['name']);
        $this->assertSame($original['title'], $default['title']);
        $this->assertSame($original['css'], $default['css']);

        $this->assertSame($this->originalDefaultJson, file_get_contents($this->backupJsonPath));
    }

    public function test_setting_a_default_keeps_vars_the_editor_does_not_manage(): void
    {
        $this->actLocally();
        $default = json_decode($this->originalDefaultJson, true);
        $default['cssVars']['light']['destructive-foreground'] = 'oklch(1 0 0)';
        file_put_contents($this->defaultJsonPath, json_encode($default));

        $this->postJson(route('themes.apply'), $this->payload())->assertOk();

        $saved = json_decode((string) file_get_contents($this->defaultJsonPath), true);
        $this->assertSame('oklch(1 0 0)', $saved['cssVars']['light']['destructive-foreground']);
        $this->assertSame('oklch(0.1 0.2 30)', $saved['cssVars']['light']['primary']);
    }

    public function test_the_default_entry_shows_the_new_default_and_the_backup_stays_out_of_the_picker(): void
    {
        $this->actLocally();
        config(['themes.enabled' => true]);

        $themeCount = count(ThemeService::discoverThemes());

        $this->postJson(route('themes.apply'), $this->payload())->assertOk();

        $this->assertCount($themeCount, ThemeService::discoverThemes());
        $this->get('/')->assertInertia(fn ($page) => $page
            ->where('themes.items.0.id', 'default')
            ->where('themes.items.0.light.--primary', 'oklch(0.1 0.2 30)')
        );
    }

    public function test_keys_that_would_break_the_css_are_rejected(): void
    {
        $this->actLocally();
        $payload = $this->payload();
        $payload['cssVars']['light']['x: red; } body { display: none } :root { --y'] = 'red';

        $this->postJson(route('themes.apply'), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cssVars.light']);
        $this->assertSame($this->originalCss, file_get_contents($this->themeCssPath));
    }

    public function test_values_that_open_a_css_comment_are_rejected(): void
    {
        $this->actLocally();
        $payload = $this->payload();
        $payload['cssVars']['light']['primary'] = 'red /* the rest of theme.css';

        $this->postJson(route('themes.apply'), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cssVars.light.primary']);
        $this->assertSame($this->originalCss, file_get_contents($this->themeCssPath));
    }

    public function test_values_that_load_external_resources_are_rejected(): void
    {
        $this->actLocally();
        $payload = $this->payload();
        $payload['cssVars']['light']['primary'] = 'url(https://evil.test/track.png)';

        $this->postJson(route('themes.apply'), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cssVars.light.primary']);
    }

    public function test_values_are_written_literally(): void
    {
        $this->actLocally();
        $payload = $this->payload();
        $payload['cssVars']['light']['font-sans'] = '"$0 Sans", sans-serif';

        $this->postJson(route('themes.apply'), $payload)->assertOk();
        $this->postJson(route('themes.apply'), $payload)->assertOk();

        $this->assertStringContainsString('--font-sans: "$0 Sans", sans-serif;', (string) file_get_contents($this->themeCssPath));
    }
}
