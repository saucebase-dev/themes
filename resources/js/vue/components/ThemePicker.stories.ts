import preview from '@/.storybook/preview';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { ref } from 'vue';
import ThemePicker from './ThemePicker.vue';

const theme = (
    id: string,
    name: string,
    primary: string,
    radius = '0.625rem',
) => ({
    id,
    name,
    description: '',
    editable: false,
    light: {
        '--background': '#ffffff',
        '--primary': primary,
        '--secondary': '#f1f5f9',
        '--foreground': '#0f172a',
        '--radius': radius,
    },
    dark: {
        '--background': '#0f172a',
        '--primary': primary,
        '--secondary': '#1e293b',
        '--foreground': '#f8fafc',
        '--radius': radius,
    },
});

const options = [
    theme('default', 'Default', '#4f46e5'),
    theme('ocean', 'Ocean', '#0284c7'),
    theme('forest', 'Forest', '#15803d', '0.25rem'),
    theme('sunset', 'Sunset', '#ea580c', '1rem'),
];

/**
 * Picks a theme: each shows its colours and corners in the current mode. A search
 * narrows the list. Picking one sends `picked` with where it was clicked, so the
 * theme can spread from there.
 */
const meta = preview.meta({
    title: 'Themes/ThemePicker',
    component: ThemePicker,
    args: { options, modelValue: 'default' },
    decorators: [() => ({ template: '<div class="max-w-xs"><story /></div>' })],
    // Its own value, so the button shows the theme picked.
    render: (args) => ({
        components: { ThemePicker },
        setup: () => ({ args, value: ref(args.modelValue) }),
        template: '<ThemePicker v-bind="args" v-model="value" />',
    }),
});
export default meta;

/** Picking a theme sets it and closes the list. */
export const Default = meta.story({
    args: { onPicked: fn() },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByTestId('theme-picker-trigger'));
        await userEvent.click(await screen.findByTestId('theme-option-ocean'));

        await expect(args.onPicked).toHaveBeenCalledWith(
            'ocean',
            expect.anything(),
        );
        await waitFor(() =>
            expect(
                canvas.getByTestId('theme-picker-trigger'),
            ).toHaveTextContent('Ocean'),
        );
    },
});

/** A search with no match. */
export const NoResults = meta.story({
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByTestId('theme-picker-trigger'));
        await userEvent.type(await screen.findByTestId('theme-search'), 'neon');

        // The list fades in: wait for it, not just for it to be in the page.
        const empty = await screen.findByText('No themes found');
        await waitFor(() => expect(empty).toBeVisible());
        await userEvent.keyboard('{Escape}');
    },
});
