import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useT } from '@/i18n';
import { router, useHttp } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import IconSave from '~icons/lucide/save';
import type { ThemePayload } from '../../lib/panel';
import type { Theme } from '../../types';

interface DialogSaveProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    toJson: (name: string) => ThemePayload;
    /** Gets the reloaded theme list, which already includes the new theme. */
    onThemeSaved?: (id: string, themes: Theme[]) => void;
}

export default function DialogSave({
    open,
    onOpenChange,
    toJson,
    onThemeSaved,
}: DialogSaveProps) {
    const t = useT();
    const http = useHttp({});
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    function close() {
        onOpenChange(false);
        setName('');
    }

    function handleSave() {
        if (!name.trim() || loading) return;
        const payload = toJson(name);

        setLoading(true);
        http.transform(() => payload);
        http.post(route('themes.store'), {
            onSuccess() {
                router.reload({
                    only: ['themes'],
                    onSuccess: (reloaded) => {
                        onThemeSaved?.(
                            payload.name,
                            (reloaded.props.themes?.items as Theme[]) ?? [],
                        );
                        close();
                        toast.success(t('Theme saved successfully'), {
                            testId: 'theme-saved-toast',
                        });
                        setLoading(false);
                    },
                });
            },
            onError(errors: Record<string, string>) {
                toast.error(t(errors?.name ?? 'Failed to save theme'));
                setLoading(false);
            },
        });
    }

    return (
        // Same layout as the app's confirm dialog (DynamicDialog), plus the name input.
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="overflow-hidden p-0 sm:max-w-sm"
                showCloseButton={false}
                onEscapeKeyDown={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                <div className="bg-background flex flex-col items-center p-6 text-center">
                    <div className="bg-primary/10 text-primary mb-4 flex size-14 items-center justify-center rounded-xl">
                        <IconSave className="size-7" />
                    </div>
                    <DialogHeader className="sm:text-center">
                        <DialogTitle>{t('Save theme')}</DialogTitle>
                        <DialogDescription>
                            {t(
                                'Save this theme to reuse it later without reconfiguring colors, fonts, and radius.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={name}
                        className="mt-4"
                        data-testid="save-theme-name"
                        placeholder={t('Theme name')}
                        disabled={loading}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                </div>
                <div className="bg-muted/50 border-t p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="dark:hover:bg-accent dark:hover:text-accent-foreground w-full"
                            data-testid="save-theme-cancel"
                            disabled={loading}
                            onClick={close}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            className="w-full"
                            data-testid="save-theme-submit"
                            disabled={!name.trim() || loading}
                            onClick={handleSave}
                        >
                            {loading ? t('Saving...') : t('Save')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
