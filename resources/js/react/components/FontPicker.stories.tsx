import preview from '@/.storybook/preview';
import { type ComponentProps, useState } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import FontPicker from './FontPicker';

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
    // The render passes the handlers: the cast says the args needn't.
    args: { fonts, value: 'Inter' } as ComponentProps<typeof FontPicker>,
    decorators: [
        (Story) => (
            <div className="max-w-xs">
                <Story />
            </div>
        ),
    ],
    // Its own value, so the button shows the font picked.
    render: function Render(args) {
        const [value, setValue] = useState(args.value);

        return <FontPicker {...args} value={value} onChange={setValue} />;
    },
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
    args: { value: '' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: /Default/ }),
        ).toBeVisible();
    },
});

/** A font that isn't in the list, such as a system font: it still shows as chosen. */
export const NotInTheList = meta.story({
    args: { value: 'Helvetica Neue' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: /Helvetica Neue/ }),
        ).toBeVisible();
    },
});
