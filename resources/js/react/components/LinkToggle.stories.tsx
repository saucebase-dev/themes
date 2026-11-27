import preview from '@/.storybook/preview';
import { TooltipProvider } from '@/components/ui/tooltip';
import { type ComponentProps, useState } from 'react';
import { expect } from 'storybook/test';
import LinkToggle from './LinkToggle';

/**
 * Links a setting across light and dark mode: locked when linked, open when not, and a
 * dash when only some of a group's settings are linked. A click links or unlinks; the
 * tooltip says which.
 */
const meta = preview.meta({
    title: 'Themes/LinkToggle',
    component: LinkToggle,
    // The render passes the handlers: the cast says the args needn't.
    args: {
        value: false,
        tooltip: 'Link across light/dark modes',
        tooltipActive: 'Synced across modes — click to unlink',
        tooltipIndeterminate: 'Some colours are linked',
    } as ComponentProps<typeof LinkToggle>,
    // Its tooltip needs a provider, which the theme panel gives it.
    decorators: [
        (Story) => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        ),
    ],
    // Its own value, so a click shows the next state.
    render: function Render(args) {
        const [value, setValue] = useState(args.value);

        return <LinkToggle {...args} value={value} onChange={setValue} />;
    },
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
export const Linked = meta.story({ args: { value: true } });

/** Some of a group's settings are linked. A click links them all. */
export const Partial = meta.story({
    args: { value: null },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Some colours are linked' }),
        ).toHaveAttribute('aria-pressed', 'mixed');
    },
});
