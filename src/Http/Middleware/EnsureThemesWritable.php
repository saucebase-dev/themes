<?php

namespace Modules\Themes\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Writes are opt-in outside local (`themes.writable`); when off, the routes don't exist. */
class EnsureThemesWritable
{
    public function handle(Request $request, Closure $next): mixed
    {
        abort_unless(config('themes.writable'), 404);

        return $next($request);
    }
}
