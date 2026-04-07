<script setup lang="ts">
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

import IconLock from '~icons/lucide/lock';
import IconLockOpen from '~icons/lucide/lock-open';

const props = defineProps<{
    label?: string;
    tooltip?: string;
    tooltipActive?: string;
}>();

const model = defineModel<boolean>({ default: false });

function toggle() {
    model.value = !model.value;
}
</script>

<template>
    <Tooltip>
        <TooltipTrigger as-child>
            <span
                class="flex items-center p-1.5 rounded-full absolute text-xs font-medium transition-colors mr-3 cursor-pointer shadow-sm"
                :class="
                    model
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                "
                @click.stop="toggle"
            >
                <IconLock v-if="model" class="size-3" />
                <IconLockOpen v-else class="size-3" />
            </span>
        </TooltipTrigger>
        <TooltipContent>
            {{
                model
                    ? (props.tooltipActive ?? $t('Active'))
                    : (props.tooltip ?? $t('Link'))
            }}
        </TooltipContent>
    </Tooltip>
</template>
