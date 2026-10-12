<?php

$isLocal = env('APP_ENV') === 'local';

return [
    'name' => 'Themes',

    /*
     * Show the theme editor panel. Off outside local by default. Turn it on for
     * a demo: while `writable` is off, visitors' edits stay in their own browser.
     */
    'enabled' => env('THEMES_ENABLED', $isLocal),

    /*
     * Allow saving and deleting presets from the panel (storage/app/themes).
     * Off outside local by default. Not recommended in production: anyone who
     * can see the panel can write. When off, the write routes return 404.
     */
    'writable' => env('THEMES_WRITABLE', $isLocal),
];
