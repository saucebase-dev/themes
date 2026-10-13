import { useT } from '@saucebase/react/i18n';
import IconSearch from '~icons/heroicons/magnifying-glass';
import IconX from '~icons/lucide/x';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    testId?: string;
    className?: string;
}

export default function SearchInput({
    value,
    onChange,
    placeholder,
    testId,
    className = '',
}: SearchInputProps) {
    const t = useT();

    return (
        <div
            className={`border-border focus-within:border-ring focus-within:ring-primary flex items-center gap-2 rounded-full border px-3 focus-within:ring-2 ${className}`}
        >
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                type="text"
                placeholder={placeholder}
                aria-label={placeholder ?? t('Search')}
                data-testid={testId}
                className="text-foreground placeholder:text-muted-foreground flex-1 border-none bg-transparent text-sm ring-0 outline-none"
            />
            {value ? (
                <button
                    type="button"
                    aria-label={t('Clear')}
                    className="text-muted-foreground focus-visible:ring-ring shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => onChange('')}
                >
                    <IconX className="size-4" aria-hidden="true" />
                </button>
            ) : (
                <IconSearch
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden="true"
                />
            )}
        </div>
    );
}
