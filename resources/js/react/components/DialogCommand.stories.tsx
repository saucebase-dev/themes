import preview from '@/.storybook/preview';
import { Button } from '@/components/ui/button';
import { type ComponentProps, useState } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import DialogCommand from './DialogCommand';

/** The command that applies a theme to the project, to copy. */
const meta = preview.meta({
    title: 'Themes/DialogCommand',
    component: DialogCommand,
    // The render passes the handlers: the cast says the args needn't.
    args: { themeId: 'ocean', open: false } as ComponentProps<
        typeof DialogCommand
    >,
    // A button opens it, as the theme panel's does.
    render: function Render(args) {
        const [open, setOpen] = useState(args.open);

        return (
            <>
                <Button variant="outline" onClick={() => setOpen(true)}>
                    How to use this theme
                </Button>
                <DialogCommand {...args} open={open} onOpenChange={setOpen} />
            </>
        );
    },
});
export default meta;

/** Shows the command for the chosen theme. */
export const Default = meta.story({
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(
            canvas.getByRole('button', { name: 'How to use this theme' }),
        );
        const dialog = await screen.findByRole('dialog');
        await waitFor(() => expect(dialog).toBeVisible());
        await expect(screen.getByRole('textbox')).toHaveValue(
            'php artisan saucebase:theme:apply ocean',
        );

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    },
});

/** Open from the start. */
export const Open = meta.story({
    args: { open: true },
    parameters: { docs: { story: { inline: false, iframeHeight: '320px' } } },
});
