import { Eye, EyeOff, Radio } from 'lucide-react';
import { useCodeStore } from '../context/code-store';
import { useSettings } from '../settings/use-settings';
import { useUiStore } from '../shell/ui-store';
import { useCoachStore } from './coach-store';

/** Shows whether Synora is following the editor live and whether Pair mode is watching. */
export function PairStatusBadge() {
  const { settings } = useSettings();
  const liveState = useCodeStore((s) => s.liveState);
  const pairStatus = useCoachStore((s) => s.pairStatus);
  const openSettings = useUiStore((s) => s.openSettings);

  const live = settings.codeAccess === 'live';
  const following = liveState === 'installed' || liveState === 'already-installed';

  let label: string;
  let tone: string;
  let Icon = EyeOff;
  if (!live) {
    label = 'Not following your code';
    tone = 'text-fg-muted';
  } else if (!following) {
    label =
      liveState === 'no-editor' || liveState === 'failed' ? 'Editor not found' : 'Connecting…';
    tone = liveState === 'connecting' ? 'text-fg-muted' : 'text-warning';
  } else if (pairStatus === 'thinking') {
    label = 'Looking at your code…';
    tone = 'text-accent';
    Icon = Eye;
  } else if (pairStatus === 'watching') {
    label = `Pair mode · ${settings.pairMode}`;
    tone = 'text-accent';
    Icon = Eye;
  } else if (pairStatus === 'error') {
    label = 'Pair check failed';
    tone = 'text-warning';
    Icon = Eye;
  } else {
    label = 'Following your code';
    tone = 'text-fg-secondary';
    Icon = Radio;
  }

  return (
    <button
      type="button"
      onClick={() => openSettings('learning')}
      className={`inline-flex items-center gap-1.5 text-[11px] ${tone} hover:text-fg`}
      title="Change live code and Pair mode settings"
    >
      <Icon
        className={`size-3.5 ${pairStatus === 'thinking' ? 'animate-pulse' : ''}`}
        aria-hidden
      />
      {label}
    </button>
  );
}
