import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useT } from '@/i18n';
import { useState } from 'react';
import type { Font } from '../../types';
import SearchInput from './SearchInput';

interface FontPickerProps {
    fonts: Font[];
    value: string;
    onChange: (family: string) => void;
    testId?: string;
}

export default function FontPicker({
    fonts,
    value,
    onChange,
    testId,
}: FontPickerProps) {
    const t = useT();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    // If the current value isn't in the provided list, prepend a synthetic entry so it
    // shows as selected rather than falling back to "Default".
    const allFonts: Font[] =
        !value || fonts.some((f) => f.family === value)
            ? fonts
            : [{ family: value, category: 'system', variants: [] }, ...fonts];

    const currentFont = allFonts.find((f) => f.family === value) ?? null;
    const currentLabel = currentFont?.family ?? (value || t('Default'));
    const currentFontCategory = currentFont
        ? `font-${currentFont.category}`
        : '';

    const query = search.toLowerCase().trim();
    const filtered = query
        ? allFonts.filter((f) => f.family.toLowerCase().includes(query))
        : allFonts;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            {/* Trigger */}
            <PopoverTrigger asChild>
                <button
                    data-testid={testId}
                    className={`border-border bg-input hover:bg-input/70 hover:text-input focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none ${currentFontCategory}`}
                >
                    <span className="bg-background text-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold shadow-sm">
                        Aa
                    </span>
                    <span className="text-foreground flex-1 text-left font-medium">
                        {currentLabel}
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
                className={`overflow-hidden p-0 ${currentFontCategory}`}
                sideOffset={4}
                align="start"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
            >
                {/* Search */}
                <div className="border-border border-b px-3 py-2">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder={t('Search fonts...')}
                    />
                </div>

                {/* Font list */}
                <ScrollArea className="h-60">
                    <div className="p-1">
                        {filtered.map((font) => (
                            <button
                                key={font.family}
                                data-testid={`font-option-${font.family.toLowerCase().replace(/\s+/g, '-')}`}
                                className={`hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-2 py-1 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none ${font.family === value ? 'bg-accent/50' : ''}`}
                                onClick={() => onChange(font.family)}
                            >
                                <span className="bg-background text-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold shadow-sm">
                                    Aa
                                </span>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-foreground truncate text-sm font-medium">
                                        {font.family}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {font.category}
                                        {font.variable && ' · Variable'}
                                    </p>
                                </div>
                                {font.family === value && (
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
                                    {t('No fonts found')}
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
