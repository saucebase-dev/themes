<?php

namespace Modules\Themes\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Applying writes resources/css/theme.css, a source file. That only means
 * something with a dev server running, so the route exists only locally.
 */
class EnsureLocalEnvironment
{
    public function handle(Request $request, Closure $next): mixed
    {
        abort_unless(app()->isLocal(), 404);

        return $next($request);
    }
}
