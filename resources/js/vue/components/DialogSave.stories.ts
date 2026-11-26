import preview from '@/.storybook/preview';
import { Button } from '@/components/ui/button';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { ref } from 'vue';
import DialogSave from './DialogSave.vue';

/**
 * Names a theme to save it. Save sends the name; whoever shows the dialog saves the
 * theme and closes it. While `saving`, its buttons wait.
 */
const meta = preview.meta({
    title: 'Themes/DialogSave',
    component: DialogSave,
    args: { saving: false },
    // A button opens it, as the theme panel's does.
    render: (args) => ({
        components: { Button, DialogSave },
        setup: () => ({ args, open: ref(args.modelValue ?? false) }),
        template: `
            <Button variant="outline" @click="open = true">Save as…</Button>
            <DialogSave v-bind="args" v-model="open" />`,
    }),
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
    args: { modelValue: true, saving: true },
    parameters: { docs: { story: { inline: false, iframeHeight: '360px' } } },
    play: async () => {
        await expect(
            await screen.findByTestId('save-theme-submit'),
        ).toHaveTextContent('Saving...');
        await expect(screen.getByTestId('save-theme-cancel')).toBeDisabled();
    },
});
