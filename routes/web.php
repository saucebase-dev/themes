<?php

use Illuminate\Support\Facades\Route;
use Modules\Themes\Http\Controllers\ThemesController;
use Modules\Themes\Http\Middleware\EnsureLocalEnvironment;
use Modules\Themes\Http\Middleware\EnsureThemesWritable;

Route::middleware(['web', EnsureThemesWritable::class, 'throttle:30,1'])->group(function (): void {
    Route::post('/themes', [ThemesController::class, 'store'])
        ->name('themes.store');

    Route::put('/themes/{name}', [ThemesController::class, 'update'])
        ->name('themes.update');

    Route::delete('/themes/{name}', [ThemesController::class, 'destroy'])
        ->name('themes.destroy');
});

Route::middleware(['web', EnsureLocalEnvironment::class, 'throttle:30,1'])->group(function (): void {
    Route::post('/themes/apply', [ThemesController::class, 'apply'])
        ->name('themes.apply');
});
