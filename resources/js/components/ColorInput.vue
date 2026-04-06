<script setup lang="ts">
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import ColorPickerPopover from './ColorPickerPopover.vue';
import TailwindColorPicker from './TailwindColorPicker.vue';
import IconTailwind from '~icons/mdi/tailwind';

const props = defineProps<{
    label: string;
    displayText?: string;
    testId?: string;
}>();

const model = defineModel<string>({ default: '' });

function onInputChange(e: Event) {
    const val = (e.target as HTMLInputElement).value.trim();
    if (!val) { return; }
    model.value = val;
}
</script>

<template>
    <InputGroup class="rounded-full">
        <!-- Left: color swatch + label -->
        <InputGroupAddon align="inline-start" >
            <ColorPickerPopover v-model="model">
                <InputGroupButton size="icon-xs" :aria-label="$t(`Open ${props.label} color picker`)">
                    <span
                        class="size-6 rounded-full border border-border/50 shadow-sm cursor-pointer"
                        :style="`background: linear-gradient(${model}, ${model}), repeating-conic-gradient(#aaa 0% 25%, white 0% 50%) 0 0 / 8px 8px`"
                    />
                </InputGroupButton>
            </ColorPickerPopover>
            <span class="text-[11px] -m-1 text-muted-foreground border-r pr-4 py-2 min-w-28">{{ props.label }}</span>
        </InputGroupAddon>

        <!-- Hex / display value -->
        <InputGroupInput
            :model-value="props.displayText ?? model"
            :data-testid="props.testId"
            class="font-mono"
            @change="onInputChange"
        />

        <!-- Right: Tailwind color picker -->
        <InputGroupAddon align="inline-end">
            <TailwindColorPicker v-model="model" :display-text="props.displayText">
                <InputGroupButton size="icon-xs" :aria-label="$t(`Pick ${props.label} color from Tailwind palette`)">
                    <IconTailwind class="text-sky-400" />
                </InputGroupButton>
            </TailwindColorPicker>
        </InputGroupAddon>
    </InputGroup>
</template>
