import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useT } from '@/i18n';
import type { SyntheticEvent } from 'react';
import IconLock from '~icons/lucide/lock';
import IconLockOpen from '~icons/lucide/lock-open';
import IconMinus from '~icons/lucide/minus';

interface LinkToggleProps {
    /** `null` means some children are linked and some are not. */
    value: boolean | null;
    onChange: (value: boolean) => void;
    tooltip?: string;
    tooltipActive?: string;
    tooltipIndeterminate?: string;
    className?: string;
}

export default function LinkToggle({
    value,
    onChange,
    tooltip,
    tooltipActive,
    tooltipIndeterminate,
    className = '',
}: LinkToggleProps) {
    const t = useT();

    const label =
        value === true
            ? (tooltipActive ?? t('Active'))
            : value === null
              ? (tooltipIndeterminate ?? t('Partially linked'))
              : (tooltip ?? t('Link'));

    function toggle(e: SyntheticEvent) {
        // Also inside a group header, which toggles on the same click or key.
        e.stopPropagation();
        e.preventDefault();
        onChange(value !== true);
    }

    const stateClass =
        value === true
            ? 'bg-primary text-primary-foreground'
            : value === null
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-pressed={value === null ? 'mixed' : value}
                    className={`focus-visible:ring-ring flex cursor-pointer items-center rounded-full p-1.5 text-xs font-medium shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none ${stateClass} ${className}`}
                    onClick={toggle}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') toggle(e);
                    }}
                >
                    {value === true ? (
                        <IconLock className="size-3" />
                    ) : value === null ? (
                        <IconMinus className="size-3" />
                    ) : (
                        <IconLockOpen className="size-3" />
                    )}
                </span>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
