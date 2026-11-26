import preview from '@/.storybook/preview';
import { TooltipProvider } from '@/components/ui/tooltip';
import { expect } from 'storybook/test';
import { ref } from 'vue';
import LinkToggle from './LinkToggle.vue';

/**
 * Links a setting across light and dark mode: locked when linked, open when not, and a
 * dash when only some of a group's settings are linked. A click links or unlinks; the
 * tooltip says which.
 */
const meta = preview.meta({
    title: 'Themes/LinkToggle',
    component: LinkToggle,
    args: {
        modelValue: false,
        tooltip: 'Link across light/dark modes',
        tooltipActive: 'Synced across modes — click to unlink',
        tooltipIndeterminate: 'Some colours are linked',
    },
    // Its tooltip needs a provider, which the theme panel gives it.
    decorators: [
        () => ({
            components: { TooltipProvider },
            template: '<TooltipProvider><story /></TooltipProvider>',
        }),
    ],
    // Its own value, so a click shows the next state.
    render: (args) => ({
        components: { LinkToggle },
        setup: () => ({ args, value: ref(args.modelValue) }),
        template: '<LinkToggle v-bind="args" v-model="value" />',
    }),
});
export default meta;

/** Not linked. A click links it. */
export const Unlinked = meta.story({
    play: async ({ canvas, userEvent }) => {
        const toggle = canvas.getByRole('button', {
            name: 'Link across light/dark modes',
        });
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        // A round button as big as its icon, wherever it is placed.
        await expect(toggle.getBoundingClientRect().width).toBeLessThan(40);

        await userEvent.click(toggle);

        await expect(
            canvas.getByRole('button', {
                name: 'Synced across modes — click to unlink',
            }),
        ).toHaveAttribute('aria-pressed', 'true');
    },
});

/** Linked. */
export const Linked = meta.story({ args: { modelValue: true } });

/** Some of a group's settings are linked. A click links them all. */
export const Partial = meta.story({
    args: { modelValue: null },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Some colours are linked' }),
        ).toHaveAttribute('aria-pressed', 'mixed');
    },
});
