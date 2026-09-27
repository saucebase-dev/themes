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
    return (
        <div
            className={`border-border focus-within:border-ring focus-within:ring-primary flex items-center gap-2 rounded-full border px-3 focus-within:ring-2 ${className}`}
        >
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                type="text"
                placeholder={placeholder}
                data-testid={testId}
                className="text-foreground placeholder:text-muted-foreground flex-1 border-none bg-transparent text-sm ring-0 outline-none"
            />
            {value ? (
                <IconX
                    className="text-muted-foreground size-4 shrink-0 cursor-pointer"
                    onClick={() => onChange('')}
                />
            ) : (
                <IconSearch
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden="true"
                />
            )}
        </div>
    );
}
