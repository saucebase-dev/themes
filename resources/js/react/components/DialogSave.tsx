import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useT } from '@saucebase/react/i18n';
import { useEffect, useState } from 'react';
import IconSave from '~icons/lucide/save';

interface DialogSaveProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The theme is being saved: the buttons wait. */
    saving?: boolean;
    /** Save, with the name. Whoever shows the dialog saves the theme and closes it. */
    onSave: (name: string) => void;
}

export default function DialogSave({
    open,
    onOpenChange,
    saving = false,
    onSave,
}: DialogSaveProps) {
    const t = useT();
    const [name, setName] = useState('');

    // A closed dialog starts over.
    useEffect(() => {
        if (!open) setName('');
    }, [open]);

    function save() {
        if (name.trim() && !saving) onSave(name);
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
                        disabled={saving}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && save()}
                    />
                </div>
                <div className="bg-muted/50 border-t p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="dark:hover:bg-accent dark:hover:text-accent-foreground w-full"
                            data-testid="save-theme-cancel"
                            disabled={saving}
                            onClick={() => onOpenChange(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            className="w-full"
                            data-testid="save-theme-submit"
                            disabled={!name.trim() || saving}
                            onClick={save}
                        >
                            {saving ? t('Saving...') : t('Save')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
