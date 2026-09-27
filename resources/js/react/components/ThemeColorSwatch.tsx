import { swatchRadiusSm } from '../../lib/theme';

export interface SwatchPreview {
    background?: string;
    primary?: string;
    secondary?: string;
    foreground?: string;
}

interface ThemeColorSwatchProps {
    preview: SwatchPreview;
    radius?: string;
}

export default function ThemeColorSwatch({
    preview,
    radius,
}: ThemeColorSwatchProps) {
    const radiusSm = swatchRadiusSm(radius);
    const foreground = preview.foreground ?? 'var(--foreground)';

    return (
        <span
            className="ring-offset-muted grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 p-1.5 shadow-xl ring-1 ring-black/10 ring-offset-2 dark:ring-white/10"
            style={{
                backgroundColor: preview.background,
                borderRadius: radius ?? 'var(--radius)',
            }}
        >
            {/* Primary circle */}
            <span
                className="size-2 shadow-sm ring-1 ring-black/10"
                style={{
                    backgroundColor: preview.primary ?? 'var(--primary)',
                    borderRadius: radiusSm,
                }}
            />
            {/* Secondary circle */}
            <span
                className="size-2 shadow-sm ring-1 ring-black/10"
                style={{
                    backgroundColor: preview.secondary ?? 'var(--secondary)',
                    borderRadius: radiusSm,
                }}
            />
            {/* Uppercase "A" — simulates heading/bold text */}
            <span
                className="flex size-2 items-center justify-center text-[12px] leading-none font-bold"
                style={{ color: foreground }}
            >
                A
            </span>
            {/* Lowercase "a" — simulates body text */}
            <span
                className="flex size-2 items-center justify-center text-[10px] leading-none opacity-70"
                style={{ color: foreground }}
            >
                a
            </span>
        </span>
    );
}
