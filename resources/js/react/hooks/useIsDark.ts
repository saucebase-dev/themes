import { useEffect, useState } from 'react';

function htmlIsDark(): boolean {
    return (
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark')
    );
}

/**
 * Whether the page is in dark mode. Read from `<html class="dark">` rather than the
 * app's `useTheme`, whose state is local to each caller: the panel has to follow
 * switches made by any other selector on the page.
 */
export function useIsDark(): boolean {
    const [isDark, setIsDark] = useState(htmlIsDark);

    useEffect(() => {
        const observer = new MutationObserver(() => setIsDark(htmlIsDark()));
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
        return () => observer.disconnect();
    }, []);

    return isDark;
}
