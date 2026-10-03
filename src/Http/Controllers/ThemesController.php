<?php

namespace Modules\Themes\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Modules\Themes\Http\Requests\ApplyThemeRequest;
use Modules\Themes\Http\Requests\SaveThemeRequest;
use Modules\Themes\Services\ThemeService;

class ThemesController
{
    public function store(SaveThemeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (ThemeService::themeExists($validated['name'])) {
            return response()->json(['errors' => ['name' => __('A theme with this name already exists.')]], 422);
        }

        ThemeService::saveUserTheme($validated['name'], $validated);

        return response()->json(['success' => true]);
    }

    public function update(SaveThemeRequest $request, string $name): JsonResponse
    {
        if (! file_exists(ThemeService::getUserThemePath($name))) {
            return response()->json(['errors' => ['name' => __('Theme not found or is not editable.')]], 404);
        }

        ThemeService::saveUserTheme($name, $request->validated());

        return response()->json(['success' => true]);
    }

    public function destroy(string $name): JsonResponse
    {
        $path = ThemeService::getUserThemePath($name);

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
}
