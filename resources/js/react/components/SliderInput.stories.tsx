import preview from '@/.storybook/preview';
import { type ComponentProps, useState } from 'react';
import { expect, waitFor } from 'storybook/test';
import SliderInput from './SliderInput';

/**
 * A number set with a slider or typed in, for a theme's sizes and amounts. The slider
 * and the field stay in step; `unit` labels the field.
 */
const meta = preview.meta({
    title: 'Themes/SliderInput',
    component: SliderInput,
    // The render passes the handlers: the cast says the args needn't.
    args: {
        label: 'Radius',
        unit: 'rem',
        min: 0,
        max: 2,
        step: 0.125,
        value: '0.625',
    } as ComponentProps<typeof SliderInput>,
    decorators: [
        (Story) => (
            <div className="max-w-md">
                <Story />
            </div>
        ),
    ],
    // Its own value, so the slider and the field can be moved.
    render: function Render(args) {
        const [value, setValue] = useState(args.value);

        return <SliderInput {...args} value={value} onChange={setValue} />;
    },
});
export default meta;

/** A size in rem. The field's buttons step it, and the slider follows. */
export const Default = meta.story({
    play: async ({ canvas, userEvent }) => {
        const field = canvas.getByRole('spinbutton');
        await expect(field).toHaveValue(0.625);

        await userEvent.click(
            canvas.getByRole('button', { name: /increase/i }),
        );

        await waitFor(() => expect(field).toHaveValue(0.75));
        await expect(canvas.getByRole('slider')).toHaveAttribute(
            'aria-valuenow',
            '0.75',
        );
    },
});

/** An amount from 0 to 1, without a unit. */
export const Amount = meta.story({
    args: {
        label: 'Opacity',
        unit: undefined,
        max: 1,
        step: 0.01,
        value: '0.1',
    },
    play: async ({ canvas }) => {
        await expect(canvas.queryByText('rem')).toBeNull();
    },
});
