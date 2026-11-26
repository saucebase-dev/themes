<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ref, watch } from 'vue';
import IconSave from '~icons/lucide/save';

const open = defineModel<boolean>({ default: false });

defineProps<{
    /** The theme is being saved: the buttons wait. */
    saving?: boolean;
}>();

const emit = defineEmits<{
    /** Save, with the name. Whoever shows the dialog saves the theme and closes it. */
    save: [name: string];
}>();

const name = ref('');

// A closed dialog starts over.
watch(open, (isOpen) => {
    if (!isOpen) name.value = '';
});

function save() {
    if (name.value.trim()) emit('save', name.value);
}
</script>

<template>
    <!-- Same layout as the app's confirm dialog (DynamicDialog), plus the name input. -->
    <Dialog :open="open" @update:open="(v) => (open = v)">
        <DialogContent
            class="overflow-hidden p-0 sm:max-w-sm"
            :show-close-button="false"
            @escape-key-down="(e) => e.preventDefault()"
            @pointer-down-outside="(e) => e.preventDefault()"
        >
            <div
                class="bg-background flex flex-col items-center p-6 text-center"
            >
                <div
                    class="bg-primary/10 text-primary mb-4 flex size-14 items-center justify-center rounded-xl"
                >
                    <IconSave class="size-7" />
                </div>
                <DialogHeader class="sm:text-center">
                    <DialogTitle>{{ $t('Save theme') }}</DialogTitle>
                    <DialogDescription>
                        {{
                            $t(
                                'Save this theme to reuse it later without reconfiguring colors, fonts, and radius.',
                            )
                        }}
                    </DialogDescription>
                </DialogHeader>
                <Input
                    v-model="name"
                    class="mt-4"
                    data-testid="save-theme-name"
                    :placeholder="$t('Theme name')"
                    :disabled="saving"
                    @keydown.enter="save"
                />
            </div>
            <div class="bg-muted/50 border-t p-4">
                <div class="grid grid-cols-2 gap-4">
                    <Button
                        variant="outline"
                        class="dark:hover:bg-accent dark:hover:text-accent-foreground w-full"
                        data-testid="save-theme-cancel"
                        :disabled="saving"
                        @click="open = false"
                    >
                        {{ $t('Cancel') }}
                    </Button>
                    <Button
                        class="w-full"
                        data-testid="save-theme-submit"
                        :disabled="!name.trim() || saving"
                        @click="save"
                    >
                        {{ saving ? $t('Saving...') : $t('Save') }}
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>
