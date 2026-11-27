import preview from '@/.storybook/preview';
import { Button } from '@/components/ui/button';
import { type ComponentProps, useState } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import ColorPickerPopover from './ColorPickerPopover';

/**
 * Picks a colour: drag over the gradient, move the hue, or type RGB or hex values; or
 * pick one of Tailwind's in the second tab. Its children are the button that opens it.
 */
const meta = preview.meta({
    title: 'Themes/ColorPickerPopover',
    component: ColorPickerPopover,
    // The render passes the handlers: the cast says the args needn't.
    args: { value: '#4f46e5' } as ComponentProps<typeof ColorPickerPopover>,
    argTypes: {
        // The story fills it itself: its control would do nothing.
        children: { control: false },
    },
    // Its own value, so the button shows the colour picked.
    render: function Render(args) {
        const [value, setValue] = useState(args.value);

        return (
            <ColorPickerPopover value={value} onChange={setValue}>
                <Button variant="outline">
                    <span
                        className="size-4 rounded-full border"
                        style={{ background: value }}
                    />
                    {value}
                </Button>
            </ColorPickerPopover>
        );
    },
});
export default meta;

/** Closed until its button is clicked. Typing a hex value sets the colour. */
export const Default = meta.story({
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: /#4f46e5/ }));
        // The popover fades in: wait for it, not just for it to be in the page.
        const picker = await screen.findByRole('slider', {
            name: 'Saturation and brightness',
        });
        await waitFor(() => expect(picker).toBeVisible());

        await userEvent.click(screen.getByTitle('Switch to hex input'));
        const hex = screen.getByRole('textbox', { name: 'Hex' });
        await userEvent.clear(hex);
        await userEvent.type(hex, 'E11D48');

        await userEvent.keyboard('{Escape}');

        await waitFor(() =>
            expect(
                canvas.getByRole('button', { name: /#e11d48/i }),
            ).toBeVisible(),
        );
    },
});

/** Tailwind's colours. Picking one sets it and closes the picker. */
export const TailwindColors = meta.story({
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: /#4f46e5/ }));
        await userEvent.click(
            await screen.findByRole('button', { name: 'Tailwind Colors' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'emerald-500' }),
        );

        await waitFor(() =>
            expect(
                screen.queryByRole('button', { name: 'Tailwind Colors' }),
            ).toBeNull(),
        );
        await expect(
            canvas.getByRole('button', { name: /oklch/ }),
        ).toBeVisible();
    },
});
