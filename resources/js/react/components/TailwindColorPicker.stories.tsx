import preview from '@/.storybook/preview';
import type { ComponentProps } from 'react';
import { action } from 'storybook/actions';
import { expect, fn } from 'storybook/test';
import TailwindColorPicker from './TailwindColorPicker';

/**
 * Tailwind's colours to pick from, in a list or a grid, with a search. Picking one sends
 * its value. ColorPickerPopover shows it in its second tab.
 */
const meta = preview.meta({
    title: 'Themes/TailwindColorPicker',
    component: TailwindColorPicker,
    // The render passes the handler: the cast says the args needn't.
    args: {} as ComponentProps<typeof TailwindColorPicker>,
    // A pick shows in the Actions panel; a story's own spy replaces it.
    render: (args) => (
        <TailwindColorPicker
            {...args}
            onSelect={args.onSelect ?? action('select')}
        />
    ),
    decorators: [
        (Story) => (
            <div className="bg-card w-85 rounded-md border">
                <Story />
            </div>
        ),
    ],
});
export default meta;

/** The list. Picking a colour sends its value. */
export const Default = meta.story({
    args: { onSelect: fn() },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'red-500' }));

        await expect(args.onSelect).toHaveBeenCalledOnce();
    },
});

/** The grid: more colours at once, named on hover. */
export const Grid = meta.story({
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(
            canvas.getByRole('button', { name: 'Grid view' }),
        );

        await expect(canvas.getByTitle('red-500')).toBeVisible();
    },
});

/** A search narrows the colours to a family or shade. */
export const Searching = meta.story({
    play: async ({ canvas, userEvent }) => {
        await userEvent.type(canvas.getByRole('textbox'), 'emerald');

        await expect(
            canvas.getByRole('button', { name: 'emerald-500' }),
        ).toBeVisible();
        await expect(
            canvas.queryByRole('button', { name: 'red-500' }),
        ).toBeNull();
    },
});

/** Nothing matches. */
export const NoResults = meta.story({
    play: async ({ canvas, userEvent }) => {
        await userEvent.type(canvas.getByRole('textbox'), 'chartreuse');

        await expect(canvas.getByText('No colors found')).toBeVisible();
    },
});
