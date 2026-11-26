import preview from '@/.storybook/preview';
import { TooltipProvider } from '@/components/ui/tooltip';
import { expect, fn, waitFor } from 'storybook/test';
import ColorInput from './ColorInput.vue';

/**
 * A theme colour: a swatch that opens the colour picker, the colour's name, its value
 * to type over, and a toggle that links it across light and dark mode.
 */
const meta = preview.meta({
    title: 'Themes/ColorInput',
    component: ColorInput,
    args: { label: 'Primary', modelValue: '#4f46e5', synced: false },
    // Its tooltip needs a provider, which the theme panel gives it.
    decorators: [
        () => ({
            components: { TooltipProvider },
            template:
                '<TooltipProvider><div class="max-w-sm"><story /></div></TooltipProvider>',
        }),
    ],
});
export default meta;

/** A colour, not linked across modes. */
export const Default = meta.story({
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('textbox')).toHaveValue('#4f46e5');
        await expect(
            canvas.getByRole('button', { name: 'Open Primary color picker' }),
        ).toBeVisible();
    },
});

/** Linked across light and dark mode. */
export const Linked = meta.story({ args: { synced: true } });

/** A value shown in another form than the one it holds, such as a Tailwind name. */
export const WithDisplayText = meta.story({
    args: {
        modelValue: 'oklch(58.5% 0.233 277.117)',
        displayText: 'indigo-500',
    },
});

/** Typing a value sets the colour. */
export const Typing = meta.story({
    args: { 'onUpdate:modelValue': fn() },
    play: async ({ args, canvas, userEvent }) => {
        const field = canvas.getByRole('textbox');
        await userEvent.clear(field);
        await userEvent.type(field, '#e11d48');
        await userEvent.tab();

        await waitFor(() =>
            expect(args['onUpdate:modelValue']).toHaveBeenCalledWith('#e11d48'),
        );
    },
});
