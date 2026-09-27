import { Input } from '@/components/ui/input';
import {
    NumberField,
    NumberFieldContent,
    NumberFieldDecrement,
    NumberFieldIncrement,
    NumberFieldInput,
} from '@/components/ui/number-field';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useT } from '@/i18n';
import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    type TouchEvent as ReactTouchEvent,
} from 'react';
import IconEyedropper from '~icons/fa-solid/eye-dropper';
import IconChevronUpDown from '~icons/heroicons/chevron-up-down';
import IconPalette from '~icons/lucide/palette';
import IconTailwind from '~icons/mdi/tailwind';
import {
    clamp,
    colorToHsv,
    hsvToRgb,
    rgbToHex,
    rgbToHsv,
} from '../../lib/color';
import TailwindColorPicker from './TailwindColorPicker';

type Hsv = { h: number; s: number; v: number };

const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

interface ColorPickerPopoverProps {
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
}

export default function ColorPickerPopover({
    value,
    onChange,
    children,
}: ColorPickerPopoverProps) {
    const t = useT();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'custom' | 'tailwind'>('custom');
    const [mode, setMode] = useState<'rgb' | 'hex'>('rgb');
    const [hsv, setHsv] = useState<Hsv>(() => colorToHsv(value));
    const [hexDraft, setHexDraft] = useState<string | null>(null);
    const [isEyeDropperOpen, setIsEyeDropperOpen] = useState(false);
    const gradientRef = useRef<HTMLDivElement>(null);
    const cleanupDrag = useRef<(() => void) | null>(null);

    // Follow outside changes while closed; start from the current value on open.
    useEffect(() => {
        if (!isOpen) setHsv(colorToHsv(value));
    }, [value, isOpen]);

    useEffect(() => () => cleanupDrag.current?.(), []);

    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const hexInput = hexDraft ?? hex.slice(1).toUpperCase();

    function commit(next: Hsv) {
        setHsv(next);
        const c = hsvToRgb(next.h, next.s, next.v);
        onChange(rgbToHex(c.r, c.g, c.b));
    }

    function updateFromPointer(
        clientX: number,
        clientY: number,
        hue: number,
    ): void {
        if (!gradientRef.current) return;
        const rect = gradientRef.current.getBoundingClientRect();
        commit({
            h: hue,
            s: clamp((clientX - rect.left) / rect.width, 0, 1) * 100,
            v: (1 - clamp((clientY - rect.top) / rect.height, 0, 1)) * 100,
        });
    }

    function startDrag(
        e: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>,
    ) {
        // React's touchstart is passive, so only mouse can be prevented here; the
        // non-passive touchmove listener below stops the page scrolling instead.
        if (!('touches' in e)) e.preventDefault();
        const hue = hsv.h;
        const point = (ev: MouseEvent | TouchEvent) =>
            'touches' in ev ? ev.touches[0] : ev;
        const first = 'touches' in e ? e.touches[0] : e;
        updateFromPointer(first.clientX, first.clientY, hue);

        const onMove = (ev: MouseEvent | TouchEvent) => {
            const p = point(ev);
            updateFromPointer(p.clientX, p.clientY, hue);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
            cleanupDrag.current = null;
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
        cleanupDrag.current = onUp;
    }

    async function pickFromScreen() {
        try {
            setIsEyeDropperOpen(true);
            // @ts-expect-error — EyeDropper is not yet in TS DOM lib
            const dropper = new window.EyeDropper();
            const { sRGBHex } = await dropper.open();
            setHsv(colorToHsv(sRGBHex));
            onChange(sRGBHex);
        } catch {
            // cancelled
        } finally {
            setIsEyeDropperOpen(false);
        }
    }

    function onRgbChange(channel: 'r' | 'g' | 'b', val: number) {
        const next = rgbToHsv(
            ...((['r', 'g', 'b'] as const).map((ch) =>
                ch === channel ? clamp(val, 0, 255) : rgb[ch],
            ) as [number, number, number]),
        );
        commit({ ...next, h: next.s > 0 ? next.h : hsv.h });
    }

    function onHexChange(e: ChangeEvent<HTMLInputElement>) {
        const val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
        setHexDraft(val.toUpperCase());
        if (val.length === 6) {
            setHexDraft(null);
            setHsv(colorToHsv('#' + val));
            onChange('#' + val.toLowerCase());
        }
    }

    function selectTailwind(color: string) {
        onChange(color);
        setIsOpen(false);
    }

    const tabClass = (tab: 'custom' | 'tailwind', border: string) =>
        `flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors ${
            activeTab === tab
                ? `text-foreground bg-card -mb-px ${border}`
                : 'text-muted-foreground hover:text-foreground bg-muted'
        }`;

    return (
        <Popover
            open={isOpen}
            onOpenChange={(open) => {
                if (open) setHsv(colorToHsv(value));
                setHexDraft(null);
                setIsOpen(open);
            }}
        >
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent
                className={`w-85 overflow-hidden p-0 ${isEyeDropperOpen ? 'opacity-0' : ''}`}
                sideOffset={6}
                align="start"
            >
                {/* Tab bar */}
                <div className="border-border flex border-b">
                    <button
                        className={tabClass('custom', 'border-r')}
                        onClick={() => setActiveTab('custom')}
                    >
                        <IconPalette className="size-5" />
                        {t('Color Picker')}
                    </button>
                    <button
                        className={tabClass('tailwind', 'border-l')}
                        onClick={() => setActiveTab('tailwind')}
                    >
                        <IconTailwind className="size-5 text-sky-400" />
                        {t('Tailwind Colors')}
                    </button>
                </div>

                {activeTab === 'custom' ? (
                    <>
                        {/* Gradient picker area */}
                        <div
                            ref={gradientRef}
                            className="relative h-40 w-full cursor-crosshair select-none"
                            style={{ background: `hsl(${hsv.h}, 100%, 50%)` }}
                            onMouseDown={startDrag}
                            onTouchStart={startDrag}
                        >
                            <div
                                className="pointer-events-none absolute inset-0"
                                style={{
                                    background:
                                        'linear-gradient(to right, white, transparent)',
                                }}
                            />
                            <div
                                className="pointer-events-none absolute inset-0"
                                style={{
                                    background:
                                        'linear-gradient(to bottom, transparent, black)',
                                }}
                            />
                            <div
                                className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ring-1 ring-black/30"
                                style={{
                                    left: `${hsv.s}%`,
                                    top: `${100 - hsv.v}%`,
                                    background: hex,
                                }}
                            />
                        </div>

                        {/* Controls */}
                        <div className="space-y-2.5 p-2.5">
                            <div className="flex items-center gap-2">
                                {hasEyeDropper && (
                                    <button
                                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring bg-muted shrink-0 rounded-md p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                        title={t('Pick color from screen')}
                                        onClick={pickFromScreen}
                                    >
                                        <IconEyedropper className="size-4" />
                                    </button>
                                )}
                                <div
                                    className="border-border size-9 shrink-0 rounded-full border-2 shadow-sm"
                                    style={{ background: hex }}
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={hsv.h}
                                    className="color-picker-hue-slider flex-1"
                                    onChange={(e) =>
                                        commit({
                                            ...hsv,
                                            h: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            {mode === 'rgb' ? (
                                <div className="flex items-end gap-1.5">
                                    {(['r', 'g', 'b'] as const).map((ch) => (
                                        <div
                                            key={ch}
                                            className="min-w-0 flex-1"
                                        >
                                            <NumberField
                                                value={rgb[ch]}
                                                min={0}
                                                max={255}
                                                step={1}
                                                onValueChange={(v) =>
                                                    onRgbChange(ch, v)
                                                }
                                            >
                                                <NumberFieldContent>
                                                    <NumberFieldDecrement />
                                                    <NumberFieldInput className="dark:bg-input/30 focus-visible:ring-ring/50 focus-visible:ring-[3px]" />
                                                    <NumberFieldIncrement />
                                                </NumberFieldContent>
                                            </NumberField>
                                            <p className="text-muted-foreground mt-1 text-center text-[10px] tracking-widest uppercase">
                                                {ch}
                                            </p>
                                        </div>
                                    ))}
                                    <button
                                        className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground mb-5 shrink-0 rounded-md border p-1.5 transition-colors"
                                        title={t('Switch to hex input')}
                                        onClick={() => setMode('hex')}
                                    >
                                        <IconChevronUpDown className="size-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-end gap-1.5">
                                    <div className="min-w-0 flex-1">
                                        <div className="border-input bg-background focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex overflow-hidden rounded-md border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
                                            <span className="text-muted-foreground flex items-center pl-3 text-sm">
                                                #
                                            </span>
                                            <Input
                                                type="text"
                                                maxLength={6}
                                                value={hexInput}
                                                className="text-foreground rounded-none border-0 bg-transparent uppercase tabular-nums shadow-none focus-visible:ring-0 dark:bg-transparent"
                                                onChange={onHexChange}
                                            />
                                        </div>
                                        <p className="text-muted-foreground mt-1 text-center text-[10px] tracking-widest uppercase">
                                            Hex
                                        </p>
                                    </div>
                                    <button
                                        className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground mb-5 shrink-0 rounded-md border p-1.5 transition-colors"
                                        title={t('Switch to RGB input')}
                                        onClick={() => setMode('rgb')}
                                    >
                                        <IconChevronUpDown className="size-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <TailwindColorPicker onSelect={selectTailwind} />
                )}
            </PopoverContent>
        </Popover>
    );
}
