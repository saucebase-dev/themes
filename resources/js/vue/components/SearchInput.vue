<script setup lang="ts">
import IconSearch from '~icons/heroicons/magnifying-glass';
import IconX from '~icons/lucide/x';

defineProps<{ placeholder?: string; testId?: string }>();
const model = defineModel<string>({ default: '' });
</script>

<template>
    <div
        class="border-border focus-within:border-ring focus-within:ring-primary flex items-center gap-2 rounded-full border px-3 focus-within:ring-2"
    >
        <input
            v-model="model"
            type="text"
            :placeholder="placeholder"
            :aria-label="placeholder ?? $t('Search')"
            :data-testid="testId"
            class="text-foreground placeholder:text-muted-foreground flex-1 border-none bg-transparent text-sm ring-0 outline-none"
        />

        <IconSearch
            v-if="!model"
            class="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
        />
        <button
            v-else
            type="button"
            :aria-label="$t('Clear')"
            class="text-muted-foreground focus-visible:ring-ring shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:outline-none"
            @click="model = ''"
        >
            <IconX class="size-4" aria-hidden="true" />
        </button>
    </div>
</template>
