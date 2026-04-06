<script setup lang="ts">
import IconSearch from '~icons/heroicons/magnifying-glass';

defineProps<{ placeholder?: string; testId?: string }>();
const model = defineModel<string>({ default: '' });
</script>

<template>
    <div class="flex items-center gap-2 rounded-full border border-border px-3  focus-within:border-ring focus-within:ring-2 focus-within:ring-primary">
        <input
            v-model="model"
            type="text"
            :placeholder="placeholder"
            :data-testid="testId"
            class="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground border-none outline-none ring-0"
        />
        <IconSearch class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </div>
</template>
