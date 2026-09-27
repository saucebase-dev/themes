<?php

namespace Modules\Themes\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;
use Modules\Themes\Http\Requests\ApplyThemeRequest;
use Modules\Themes\Http\Requests\SaveThemeRequest;
use Modules\Themes\Services\ThemeService;

class ThemesController extends Controller
{
    public function store(SaveThemeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $dir = storage_path('app/themes');
        $path = $this->themePath($validated['name']);

        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        if ($this->themeExists($validated['name'])) {
            return response()->json(['errors' => ['name' => __('A theme with this name already exists.')]], 422);
        }

        file_put_contents($path, json_encode($validated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return response()->json(['success' => true]);
    }

    public function update(SaveThemeRequest $request, string $name): JsonResponse
    {
        $nameValidator = Validator::make(
            ['name' => $name],
            ['name' => ['required', 'string', 'regex:/^[a-z0-9-]+$/']]
        );

        if ($nameValidator->fails()) {
            return response()->json(['errors' => $nameValidator->errors()], 422);
        }

        $validated = $request->validated();

        $path = $this->themePath($name);

        if (! file_exists($path)) {
            return response()->json(['errors' => ['name' => __('Theme not found or is not editable.')]], 404);
        }

        file_put_contents($path, json_encode($validated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return response()->json(['success' => true]);
    }

    public function destroy(string $name): JsonResponse
    {
        $validator = Validator::make(
            ['name' => $name],
            ['name' => ['required', 'string', 'regex:/^[a-z0-9-]+$/']]
        );

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $path = $this->themePath($name);

        if (! file_exists($path)) {
            return response()->json(['errors' => ['name' => __('Theme not found.')]], 404);
        }

        unlink($path);

        return response()->json(['success' => true]);
    }

    /** Make the panel's current theme the app default: theme.css plus the picker's Default entry. */
    public function apply(ApplyThemeRequest $request): JsonResponse
    {
        /** @var array{theme?: array<string, string>, light: array<string, string>, dark: array<string, string>} $cssVars */
        $cssVars = $request->validated('cssVars');
        ThemeService::applyToCss($cssVars);
        ThemeService::replaceDefault($cssVars);

        return response()->json(['success' => true]);
    }

    private function themePath(string $name): string
    {
        return storage_path("app/themes/{$name}.json");
    }

    private function themeExists(string $name): bool
    {
        return file_exists($this->themePath($name))
            || file_exists(module_path('Themes', "resources/themes/{$name}.json"));
    }
}
