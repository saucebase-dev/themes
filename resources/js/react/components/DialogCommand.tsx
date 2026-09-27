import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useT } from '@/i18n';
import { toast } from 'sonner';
import IconCopy from '~icons/lucide/copy';

interface DialogCommandProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    themeId: string;
}

export default function DialogCommand({
    open,
    onOpenChange,
    themeId,
}: DialogCommandProps) {
    const t = useT();
    const command = `php artisan saucebase:theme:apply ${themeId}`;

    function handleCopy() {
        navigator.clipboard
            .writeText(command)
            .then(() => toast.success(t('Copied to clipboard')))
            .catch(() => toast.error(t('Failed to copy to clipboard')));
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('Use this theme')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'Run this command to apply the theme to your project.',
                        )}
                    </DialogDescription>
                </DialogHeader>
                <ButtonGroup className="w-full">
                    <Input
                        value={command}
                        readOnly
                        className="flex-1 font-mono text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopy}>
                        <IconCopy className="size-4" />
                    </Button>
                </ButtonGroup>
            </DialogContent>
        </Dialog>
    );
}
