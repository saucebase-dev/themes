import preview from '@/.storybook/preview';
import { Button } from '@/components/ui/button';
import { type ComponentProps, useState } from 'react';
import { expect, fn, screen, waitFor } from 'storybook/test';
import DialogSave from './DialogSave';

/**
 * Names a theme to save it. Save sends the name; whoever shows the dialog saves the
 * theme and closes it. While `saving`, its buttons wait.
 */
const meta = preview.meta({
    title: 'Themes/DialogSave',
    component: DialogSave,
    // The render passes the handlers: the cast says the args needn't.
    args: { saving: false, open: false } as ComponentProps<typeof DialogSave>,
    // A button opens it, as the theme panel's does.
    render: function Render(args) {
        const [open, setOpen] = useState(args.open);

        return (
            <>
                <Button variant="outline" onClick={() => setOpen(true)}>
                    Save as…
                </Button>
                <DialogSave {...args} open={open} onOpenChange={setOpen} />
            </>
        );
    },
});
export default meta;

/** Save waits for a name, then sends it. */
export const Default = meta.story({
    args: { onSave: fn() },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Save as…' }));
        const save = await screen.findByTestId('save-theme-submit');
        await expect(save).toBeDisabled();

        await userEvent.type(screen.getByTestId('save-theme-name'), 'Ocean');
        await userEvent.click(save);

        await expect(args.onSave).toHaveBeenCalledWith('Ocean');
        await userEvent.click(screen.getByTestId('save-theme-cancel'));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    },
});

/** Saving: the buttons wait. */
export const Saving = meta.story({
    args: { open: true, saving: true },
    parameters: { docs: { story: { inline: false, iframeHeight: '360px' } } },
    play: async () => {
        await expect(
            await screen.findByTestId('save-theme-submit'),
        ).toHaveTextContent('Saving...');
        await expect(screen.getByTestId('save-theme-cancel')).toBeDisabled();
    },
});
