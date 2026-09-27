import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import { useT } from '@/i18n';
import { useEffect, useMemo, useState } from 'react';
import IconEyedropper from '~icons/fa-solid/eye-dropper';
import { contrastingIconColor, swatchBackground } from '../../lib/color';
import ColorPickerPopover from './ColorPickerPopover';
import LinkToggle from './LinkToggle';

interface ColorInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    synced: boolean;
    onSyncedChange: (synced: boolean) => void;
    testId?: string;
}

export default function ColorInput({
    label,
    value,
    onChange,
    synced,
    onSyncedChange,
    testId,
}: ColorInputProps) {
    const t = useT();
    // Typed text is committed on blur/Enter, like a native `change` event.
    const [draft, setDraft] = useState(value);
    useEffect(() => setDraft(value), [value]);

    const iconColor = useMemo(() => contrastingIconColor(value), [value]);

    function commit() {
        const val = draft.trim();
        if (val && val !== value) {
            onChange(val);
        } else {
            setDraft(value);
        }
    }

    return (
        <InputGroup className="group/input border-border rounded-full">
            {/* Left: color swatch + label */}
            <InputGroupAddon align="inline-start">
                <ColorPickerPopover value={value} onChange={onChange}>
                    <InputGroupButton
                        size="icon-xs"
                        aria-label={t(`Open ${label} color picker`)}
                    >
                        <span
                            className="border-border/50 relative size-6 cursor-pointer rounded-full border"
                            style={{ background: swatchBackground(value) }}
                        >
                            <IconEyedropper
                                className="absolute inset-0 m-auto size-3 opacity-0 transition-opacity group-focus-within/input:opacity-70 group-hover/input:opacity-70"
                                style={{ color: iconColor }}
                            />
                        </span>
                    </InputGroupButton>
                </ColorPickerPopover>
                <span className="text-muted-foreground mr-1 min-w-20 border-r py-2 pr-4 text-[11px]">
                    {label}
                </span>
            </InputGroupAddon>

            {/* Hex / display value */}
            <InputGroupInput
                value={draft}
                data-testid={testId}
                name={testId}
                className="font-mono text-sm"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === 'Enter' && commit()}
            />

            {/* Right: sync toggle */}
            <InputGroupAddon align="inline-end" className="relative pl-3">
                <LinkToggle
                    value={synced}
                    onChange={onSyncedChange}
                    tooltip={t('Link across light/dark modes')}
                    tooltipActive={t('Synced across modes — click to unlink')}
                    className="-mr-1"
                />
            </InputGroupAddon>
        </InputGroup>
    );
}
