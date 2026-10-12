<script setup lang="ts">
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

import IconLock from '~icons/lucide/lock';
import IconLockOpen from '~icons/lucide/lock-open';
import IconMinus from '~icons/lucide/minus';
import { trans } from 'laravel-vue-i18n';
import { computed } from 'vue';

const props = defineProps<{
    label?: string;
    tooltip?: string;
    tooltipActive?: string;
    tooltipIndeterminate?: string;
}>();

const model = defineModel<boolean | null>({ default: false });

const stateLabel = computed(() =>
    model.value === true
        ? (props.tooltipActive ?? trans('Active'))
        : model.value === null
          ? (props.tooltipIndeterminate ?? trans('Partially linked'))
          : (props.tooltip ?? trans('Link')),
);

function toggle() {
    model.value = model.value === true ? false : true;
}
</script>

<template>
    <Tooltip>
        <TooltipTrigger as-child>
            <span
                class="focus-visible:ring-ring flex cursor-pointer items-center rounded-full p-1.5 text-xs font-medium shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                :class="
                    model === true
                        ? 'bg-primary text-primary-foreground'
                        : model === null
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                "
                role="button"
                tabindex="0"
                :aria-label="stateLabel"
                :aria-pressed="model === null ? 'mixed' : model"
                @click.stop.prevent="toggle"
                @keydown.enter.stop.prevent="toggle"
                @keydown.space.stop.prevent="toggle"
                v-bind="$attrs"
            >
                <IconLock v-if="model === true" class="size-3" />
                <IconMinus v-else-if="model === null" class="size-3" />
                <IconLockOpen v-else class="size-3" />
            </span>
        </TooltipTrigger>
        <TooltipContent>{{ stateLabel }}</TooltipContent>
    </Tooltip>
</template>
