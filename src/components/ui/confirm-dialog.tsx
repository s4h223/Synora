import { AlertDialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { Button } from './button';

interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm(): void | Promise<void>;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl border bg-surface p-4 shadow-2xl animate-fade-in">
          <AlertDialog.Title className="font-medium text-fg text-sm">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-fg-secondary text-xs leading-relaxed">
            {description}
          </AlertDialog.Description>
          <div className="flex justify-end gap-2 pt-1">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="danger" size="sm" onClick={() => void onConfirm()}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
