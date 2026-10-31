import type { ModulePlaywrightOptions } from '@saucebase/core/modules';

export const playwright = {
    // "Set as default" rewrites the site's default theme and theme.css, and the
    // panel tests save themes every page reads: nothing may run beside them.
    runAlone: true,
} satisfies ModulePlaywrightOptions;
