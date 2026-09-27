import { ScrollArea } from '@/components/ui/scroll-area';
import { useT } from '@/i18n';
import { useState } from 'react';
import IconList from '~icons/heroicons/bars-3';
import IconSearch from '~icons/heroicons/magnifying-glass';
import IconGrid from '~icons/heroicons/squares-2x2';
import { swatchBackground } from '../../lib/color';
import { filterPalette } from '../../lib/tailwind';
import SearchInput from './SearchInput';

export default function TailwindColorPicker({
    onSelect,
}: {
    onSelect: (value: string) => void;
}) {
    const t = useT();
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const filtered = filterPalette(search);

    const viewButtonClass = (mode: 'list' | 'grid') =>
        `cursor-pointer px-2 py-1.5 transition-colors ${
            viewMode === mode
                ? 'bg-primary/70 text-primary-foreground'
                : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
        }`;

    return (
        <>
            {/* Search + view toggle */}
            <div className="border-border bg-card flex items-center gap-2 border-b px-3 py-2">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    className="flex-1"
                    placeholder={t('Search Tailwind colors...')}
                />
                <div className="border-border flex shrink-0 overflow-hidden rounded-md border">
                    <button
                        className={viewButtonClass('list')}
                        aria-label={t('List view')}
                        onClick={() => setViewMode('list')}
                    >
                        <IconList className="size-4" />
                    </button>
                    <button
                        className={viewButtonClass('grid')}
                        aria-label={t('Grid view')}
                        onClick={() => setViewMode('grid')}
                    >
                        <IconGrid className="size-4" />
                    </button>
                </div>
            </div>

            {/* Color list */}
            <ScrollArea className="h-60">
                <div className="p-2">
                    {filtered.map((fam) =>
                        viewMode === 'list' ? (
                            fam.colors.map((color) => (
                                <button
                                    key={color.name}
                                    className="hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                    onClick={() => onSelect(color.value)}
                                >
                                    <span
                                        className="border-border/60 size-7 shrink-0 rounded-md border shadow-sm"
                                        style={{
                                            background: swatchBackground(
                                                color.value,
                                            ),
                                        }}
                                    />
                                    <span className="text-foreground text-sm">
                                        {color.name}
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div
                                key={fam.key}
                                className="mb-1 grid grid-cols-11 gap-0.5 px-1 py-0.5"
                            >
                                {fam.colors.map((color) => (
                                    <button
                                        key={color.name}
                                        className="group focus-visible:outline-none"
                                        title={color.name}
                                        onClick={() => onSelect(color.value)}
                                    >
                                        <span
                                            className="border-border/40 group-focus-visible:ring-ring block size-5 rounded border shadow-sm transition-transform group-hover:scale-110 group-focus-visible:ring-2"
                                            style={{
                                                background: swatchBackground(
                                                    color.value,
                                                ),
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        ),
                    )}

                    {/* Empty state */}
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                            <IconSearch className="text-muted-foreground/40 size-8" />
                            <p className="text-muted-foreground text-sm">
                                {t('No colors found')}
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </>
    );
}
