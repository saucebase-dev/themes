import preview from '@/.storybook/preview';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ComponentProps } from 'react';
import { action } from 'storybook/actions';
import { expect, fn, waitFor } from 'storybook/test';
import ColorInput from './ColorInput';

/**
 * A theme colour: a swatch that opens the colour picker, the colour's name, its value
 * to type over, and a toggle that links it across light and dark mode.
 */
const meta = preview.meta({
    title: 'Themes/ColorInput',
    component: ColorInput,
    // The render passes the handlers: the cast says the args needn't.
    args: {
        label: 'Primary',
        value: '#4f46e5',
        synced: false,
    } as ComponentProps<typeof ColorInput>,
    // Changes show in the Actions panel; a story's own spy replaces them.
    render: (args) => (
        <ColorInput
            {...args}
            onChange={args.onChange ?? action('change')}
            onSyncedChange={args.onSyncedChange ?? action('synced change')}
        />
    ),
    // Its tooltip needs a provider, which the theme panel gives it.
    decorators: [
        (Story) => (
            <TooltipProvider>
                <div className="max-w-sm">
                    <Story />
                </div>
            </TooltipProvider>
        ),
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

/** Typing a value sets the colour. */
export const Typing = meta.story({
    args: { onChange: fn() },
    play: async ({ args, canvas, userEvent }) => {
        const field = canvas.getByRole('textbox');
        await userEvent.clear(field);
        await userEvent.type(field, '#e11d48');
        await userEvent.tab();

        await waitFor(() =>
            expect(args.onChange).toHaveBeenCalledWith('#e11d48'),
        );
    },
});
