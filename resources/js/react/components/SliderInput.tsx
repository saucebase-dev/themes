import {
    NumberField,
    NumberFieldContent,
    NumberFieldDecrement,
    NumberFieldIncrement,
    NumberFieldInput,
} from '@/components/ui/number-field';
import { Slider } from '@/components/ui/slider';

interface SliderInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
    testId?: string;
}

export default function SliderInput({
    label,
    value,
    onChange,
    unit,
    min = 0,
    max = 1,
    step = 0.01,
    testId,
}: SliderInputProps) {
    const numericValue = Number(value);

    return (
        <div className="flex items-center gap-3">
            <span className="text-foreground ml-1 min-w-12 shrink-0 text-sm">
                {label}
            </span>
            <Slider
                className="flex-1"
                min={min}
                max={max}
                step={step}
                value={[numericValue]}
                onValueChange={(v) => v.length && onChange(String(v[0]))}
            />
            <div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex w-32 shrink-0 overflow-hidden rounded-md border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
                <NumberField
                    value={numericValue}
                    min={min}
                    max={max}
                    step={step}
                    className="min-w-0 flex-1"
                    onValueChange={(v) => onChange(String(v))}
                >
                    <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput
                            data-testid={testId}
                            className="rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
                        />
                        <NumberFieldIncrement />
                    </NumberFieldContent>
                </NumberField>
                {unit && (
                    <span className="text-muted-foreground border-input flex items-center border-l px-2 text-sm">
                        {unit}
                    </span>
                )}
            </div>
        </div>
    );
}
