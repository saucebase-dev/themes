import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useT } from '@/i18n';
import { revealOrigin, type RevealOrigin } from '@js/lib/themeReveal';
import { useState, type MouseEvent } from 'react';
import type { Theme } from '../../types';
import { useIsDark } from '../hooks/useIsDark';
import SearchInput from './SearchInput';
import ThemeColorSwatch from './ThemeColorSwatch';

interface ThemePickerProps {
    options: Theme[];
    value: string;
    onPicked: (id: string, origin: RevealOrigin) => void;
}

export default function ThemePicker({
    options,
    value,
    onPicked,
}: ThemePickerProps) {
    const t = useT();
    const mode = useIsDark() ? 'dark' : 'light';
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const themes = options.map((p) => ({
        id: p.id,
        name: p.name,
        preview: {
            background: p[mode]['--background'],
            primary: p[mode]['--primary'],
            secondary: p[mode]['--secondary'],
            foreground: p[mode]['--foreground'],
        },
        radius: p[mode]['--radius'] ?? '0.625rem',
    }));

    const current = themes.find((th) => th.id === value) ?? themes[0];
    const query = search.toLowerCase().trim();
    const filtered = query
        ? themes.filter((th) => th.name.toLowerCase().includes(query))
        : themes;

    function select(id: string, event: MouseEvent<HTMLElement>) {
        // Measured before the popover closes and removes the option.
        onPicked(id, revealOrigin(event.currentTarget));
        setIsOpen(false);
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            {/* Trigger: color circles + theme name + chevron */}
            <PopoverTrigger asChild>
                <button
                    data-testid="theme-picker-trigger"
                    className="border-border bg-input hover:bg-input/70 hover:text-input focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm shadow-[0_2px_8px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)] transition-colors focus-visible:ring-2 focus-visible:outline-none dark:shadow-[0_2px_8px_rgba(0,0,0,0.35),0_1px_3px_rgba(0,0,0,0.2)]"
                >
                    {current && (
                        <ThemeColorSwatch
                            preview={current.preview}
                            radius={current.radius}
                        />
                    )}
                    <span className="text-foreground flex-1 text-left font-medium">
                        {current?.name}
                    </span>
                    <svg
                        className={`text-muted-foreground size-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>
            </PopoverTrigger>

            {/* Dropdown */}
            <PopoverContent
                className="overflow-hidden p-0"
                sideOffset={4}
                align="start"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
            >
                {/* Search */}
                <div className="border-border border-b px-3 py-2">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder={t('Search themes...')}
                        testId="theme-search"
                    />
                </div>

                {/* Theme list */}
                <ScrollArea className="h-72">
                    <div className="p-1">
                        {filtered.map((theme) => (
                            <button
                                key={theme.id}
                                data-testid={`theme-option-${theme.id}`}
                                className="hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                onClick={(e) => select(theme.id, e)}
                            >
                                <ThemeColorSwatch
                                    preview={theme.preview}
                                    radius={theme.radius}
                                />
                                <span className="text-foreground flex-1 font-medium">
                                    {theme.name}
                                </span>
                                {/* Checkmark */}
                                {theme.id === value && (
                                    <svg
                                        className="text-muted-foreground size-4 shrink-0"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M20 6 9 17l-5-5" />
                                    </svg>
                                )}
                            </button>
                        ))}

                        {/* Empty state */}
                        {filtered.length === 0 && (
                            <div className="flex flex-col items-center gap-2 py-10 text-center">
                                <svg
                                    className="text-muted-foreground/40 size-8"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                                <p className="text-muted-foreground text-sm">
                                    {t('No themes found')}
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
