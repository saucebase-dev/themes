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
import { useHttp } from '@/composables/useHttp';
import { router } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import IconSave from '~icons/lucide/save';

const open = defineModel<boolean>({ default: false });

const props = defineProps<{
    toJson: (name: string) => {
        name: string;
        title: string;
        description: string;
        cssVars: {
            theme?: Record<string, string>;
            light: Record<string, string>;
            dark: Record<string, string>;
        };
    };
    onThemeSaved?: (id: string) => void;
}>();

const name = ref('');
const loading = ref(false);
const isLoading = computed(() => loading.value);

const handleCancel = () => {
    open.value = false;
    name.value = '';
};

const handleSave = async () => {
    const payload = props.toJson(name.value);
    const http = useHttp(payload).withAllErrors();

    http.post(route('themes.store'), {
        onBefore() {
            loading.value = true;
        },
        onSuccess() {
            router.reload({
                only: ['themes'],
                onSuccess: () => {
                    props.onThemeSaved?.(payload.name);
                    open.value = false;
                    name.value = '';
                    toast.success(trans('Theme saved successfully'), {
                        testId: 'theme-saved-toast',
                    });
                    loading.value = false;
                },
            });
        },
        onError: (errors) => {
            if (errors?.name) toast.error(trans(errors.name));
            else toast.error(trans('Failed to save theme'));
            return true;
        },
        onFinish: () => {
            loading.value = false;
        },
    });
};
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
                    :disabled="isLoading"
                    @keydown.enter="handleSave"
                />
            </div>
            <div class="bg-muted/50 border-t p-4">
                <div class="grid grid-cols-2 gap-4">
                    <Button
                        variant="outline"
                        class="dark:hover:bg-accent dark:hover:text-accent-foreground w-full"
                        data-testid="save-theme-cancel"
                        :disabled="isLoading"
                        @click="handleCancel"
                    >
                        {{ $t('Cancel') }}
                    </Button>
                    <Button
                        class="w-full"
                        data-testid="save-theme-submit"
                        :disabled="!name.trim() || isLoading"
                        @click="handleSave"
                    >
                        {{ isLoading ? $t('Saving...') : $t('Save') }}
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>
