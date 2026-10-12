import { ArrowLeft, Settings } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo-mark';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';

interface HeaderProps {
  view: 'main' | 'settings';
  onOpenSettings(): void;
  onBack(): void;
}

export function Header({ view, onOpenSettings, onBack }: HeaderProps) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b bg-bg px-3">
      {view === 'settings' ? (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back">
            <ArrowLeft />
          </Button>
          <h1 className="font-medium text-fg text-sm">Settings</h1>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <LogoMark className="size-4.5" />
          <h1 className="font-semibold text-fg text-sm tracking-tight">Synora</h1>
        </div>
      )}
      {view === 'main' && (
        <Tooltip content="Settings">
          <Button variant="ghost" size="icon-sm" onClick={onOpenSettings} aria-label="Settings">
            <Settings />
          </Button>
        </Tooltip>
      )}
    </header>
  );
}
