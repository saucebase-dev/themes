<script setup lang="ts">
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ref } from 'vue';
import IconRefreshCw from '~icons/lucide/refresh-cw';

const props = defineProps<{
    label?: string;
    tooltip?: string;
    tooltipActive?: string;
}>();

const model = defineModel<boolean>({ default: false });

const animating = ref(false);

function toggle() {
    animating.value = true;
    setTimeout(() => { animating.value = false; }, 700);
    model.value = !model.value;
}
</script>

<template>
    <Tooltip>
        <TooltipTrigger as-child>
            <span
                class="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
                :class="model
                    ? 'bg-green-500/10 text-green-500'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
                @click.stop="toggle"
            >
                <IconRefreshCw class="size-3 transition-transform" :class="{ 'animate-spin': animating }" />
                {{ props.label ?? $t('SYNC') }}
                <span v-if="model" class="relative flex size-2">
                    <span class="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span class="relative inline-flex size-2 rounded-full bg-green-500" />
                </span>
            </span>
        </TooltipTrigger>
        <TooltipContent>
            {{ model ? (props.tooltipActive ?? $t('Active')) : (props.tooltip ?? $t('Sync')) }}
        </TooltipContent>
    </Tooltip>
</template>
