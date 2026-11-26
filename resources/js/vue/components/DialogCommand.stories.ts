import preview from '@/.storybook/preview';
import { Button } from '@/components/ui/button';
import { expect, screen, waitFor } from 'storybook/test';
import { ref } from 'vue';
import DialogCommand from './DialogCommand.vue';

/** The command that applies a theme to the project, to copy. */
const meta = preview.meta({
    title: 'Themes/DialogCommand',
    component: DialogCommand,
    args: { themeId: 'ocean' },
    // A button opens it, as the theme panel's does.
    render: (args) => ({
        components: { Button, DialogCommand },
        setup: () => ({ args, open: ref(args.modelValue ?? false) }),
        template: `
            <Button variant="outline" @click="open = true">How to use this theme</Button>
            <DialogCommand v-bind="args" v-model="open" />`,
    }),
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
    args: { modelValue: true },
    parameters: { docs: { story: { inline: false, iframeHeight: '320px' } } },
});
