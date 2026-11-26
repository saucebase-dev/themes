import preview from '@/.storybook/preview';
import { expect, screen, waitFor } from 'storybook/test';
import { ref } from 'vue';
import FontPicker from './FontPicker.vue';

const fonts = [
    {
        family: 'Inter',
        category: 'sans-serif',
        variants: ['400', '700'],
        variable: true,
    },
    {
        family: 'Nunito',
        category: 'sans-serif',
        variants: ['400', '700'],
        variable: true,
    },
    { family: 'Lora', category: 'serif', variants: ['400', '700'] },
    {
        family: 'JetBrains Mono',
        category: 'monospace',
        variants: ['400'],
        variable: true,
    },
];

/**
 * Picks a theme's font from a list with a search. A font set elsewhere that isn't in the
 * list still shows as chosen; with none, it says Default.
 */
const meta = preview.meta({
    title: 'Themes/FontPicker',
    component: FontPicker,
    args: { fonts, modelValue: 'Inter' },
    decorators: [() => ({ template: '<div class="max-w-xs"><story /></div>' })],
    // Its own value, so the button shows the font picked.
    render: (args) => ({
        components: { FontPicker },
        setup: () => ({ args, value: ref(args.modelValue) }),
        template: '<FontPicker v-bind="args" v-model="value" />',
    }),
});
export default meta;

/** A font chosen. A search narrows the list; picking a font sets it. */
export const Default = meta.story({
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: /Inter/ }));
        await userEvent.type(
            await screen.findByRole('textbox', { name: 'Search fonts...' }),
            'lora',
        );
        await userEvent.click(screen.getByRole('button', { name: /Lora/ }));

        await waitFor(() =>
            expect(canvas.getByRole('button', { name: /Lora/ })).toBeVisible(),
        );
        await userEvent.keyboard('{Escape}');
    },
});

/** No font chosen: the theme's default. */
export const NoneChosen = meta.story({
    args: { modelValue: null },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: /Default/ }),
        ).toBeVisible();
    },
});

/** A font that isn't in the list, such as a system font: it still shows as chosen. */
export const NotInTheList = meta.story({
    args: { modelValue: 'Helvetica Neue' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: /Helvetica Neue/ }),
        ).toBeVisible();
    },
});
