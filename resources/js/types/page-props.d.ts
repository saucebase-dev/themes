import type { Font, Theme } from './index';

declare module '@inertiajs/core' {
    interface PageProps {
        themes?: {
            items: Theme[];
            canSave: boolean;
            canApply: boolean;
            fonts: {
                sans: Font[];
                serif: Font[];
                mono: Font[];
            };
        } | null;
    }
}

export {};
