import type { Font, Theme } from './index';

declare module '@inertiajs/core' {
    interface PageProps {
        themes?: {
            allow_editing: boolean;
            items: Theme[];
            fonts: {
                sans: Font[];
                serif: Font[];
                mono: Font[];
            };
        } | null;
    }
}

export {};
