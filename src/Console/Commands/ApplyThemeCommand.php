<?php

namespace Modules\Themes\Console\Commands;

use Illuminate\Console\Command;
use Modules\Themes\Services\ThemeService;
use RuntimeException;

class ApplyThemeCommand extends Command
{
    protected $signature = 'saucebase:theme:apply {theme : The theme ID to apply (e.g. blueberry)}';

    protected $description = 'Apply a theme by patching its variables into theme.css';

    public function handle(): int
    {
        $theme = $this->argument('theme');

        if (! ThemeService::themeExists($theme)) {
            $this->error("Theme '{$theme}' not found.");

            return self::FAILURE;
        }

        $content = ThemeService::getTheme($theme);
        if ($content === false) {
            $this->error("Could not read theme: {$theme}");

            return self::FAILURE;
        }

        /** @var array<string, mixed>|null $data */
        $data = json_decode($content, true);

        if (! is_array($data) || ! isset($data['cssVars']) || ! is_array($data['cssVars'])) {
            $this->error('Invalid theme file format');

            return self::FAILURE;
        }

        /** @var array<string, array<string, string>> $layerBase */
        $layerBase = isset($data['css']['@layer base']) && is_array($data['css']['@layer base'])
            ? $data['css']['@layer base']
            : [];

        try {
            $counts = ThemeService::applyToCss($data['cssVars'], $layerBase);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("Theme '{$theme}' applied: {$counts['light']} light vars, {$counts['dark']} dark vars patched.");
        $this->line('Run <comment>npm run build</comment> to compile the changes.');

        return self::SUCCESS;
    }
}
