import { useLiveQuery } from 'dexie-react-hooks';
import { Mic, Trash2 } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Switch } from '@/components/ui/switch';
import { countLearningRecords, deleteAllLearningData } from '@/lib/db/repository';
import { db } from '@/lib/db/schema';
import type { CodeAccess, ExperienceLevel, PairMode } from '@/lib/settings';
import {
  type MicPermission,
  openMicPermissionPage,
  queryMicPermission,
  requestMicAccess,
} from '@/lib/voice/mic-permission';
import { useCodeStore } from '../context/code-store';
import { type SettingsSection, useUiStore } from '../shell/ui-store';
import { AiSettings } from './AiSettings';
import { useSettings } from './use-settings';

export const CODE_ACCESS_OPTIONS: { value: CodeAccess; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'ask', label: 'Ask' },
  { value: 'live', label: 'Live' },
];

export const CODE_ACCESS_HELP: Record<CodeAccess, string> = {
  off: 'Synora never reads your editor. You can still paste code manually.',
  ask: 'Synora reads your editor only when you click “Read from editor”.',
  live: 'Synora follows your editor as you type, so it always sees your latest code. Code is sent to your AI provider only with your questions (and Pair mode checks, if on).',
};

export const LEVEL_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const LEVEL_HELP: Record<ExperienceLevel, string> = {
  beginner:
    'Explains syntax, terms and each step in plain words. Great if you’re new to coding or LeetCode.',
  intermediate: 'Assumes you know the language; focuses on patterns and reasoning.',
  advanced: 'Concise and technical: insights, edge cases, and complexity.',
};

const PAIR_OPTIONS: { value: PairMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'quiet', label: 'Quiet' },
  { value: 'active', label: 'Active' },
];

const PAIR_HELP: Record<PairMode, string> = {
  off: 'Synora only answers when you ask.',
  quiet:
    'When you pause, Synora glances at your code and speaks up only about likely bugs or a wrong direction (at most about once a minute).',
  active:
    'Like a pair programmer: tips, explanations of what you just wrote, and bugs (at most about twice a minute).',
};

export function SettingsView() {
  const { settings, update } = useSettings();
  const section = useUiStore((s) => s.settingsSection);
  const trackingId = useId();

  useEffect(() => {
    if (section) document.getElementById(`settings-${section}`)?.scrollIntoView({ block: 'start' });
  }, [section]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 animate-fade-in">
      <Section id="ai" title="AI provider">
        <AiSettings />
      </Section>

      <Section id="learning" title="Learning">
        <Row
          label="Experience level"
          help={LEVEL_HELP[settings.experienceLevel]}
          stacked
          control={
            <SegmentedControl
              aria-label="Experience level"
              value={settings.experienceLevel}
              options={LEVEL_OPTIONS}
              onValueChange={(experienceLevel) => void update({ experienceLevel })}
            />
          }
        />
        <Row
          label="Pair mode"
          help={
            settings.codeAccess === 'live' || settings.pairMode === 'off'
              ? `${PAIR_HELP[settings.pairMode]}${settings.pairMode !== 'off' ? ' Each check is a small AI request.' : ''}`
              : 'Pair mode needs Live code access (Privacy → Editor code access).'
          }
          control={
            <SegmentedControl
              aria-label="Pair mode"
              value={settings.pairMode}
              options={PAIR_OPTIONS}
              onValueChange={(pairMode) =>
                void update(
                  pairMode !== 'off' && settings.codeAccess !== 'live'
                    ? { pairMode, codeAccess: 'live' }
                    : { pairMode },
                )
              }
            />
          }
        />
      </Section>

      <Section id="privacy" title="Privacy">
        <Row
          label="Editor code access"
          help={CODE_ACCESS_HELP[settings.codeAccess]}
          control={
            <SegmentedControl
              aria-label="Editor code access"
              value={settings.codeAccess}
              options={CODE_ACCESS_OPTIONS}
              onValueChange={(codeAccess) =>
                void update(
                  codeAccess === 'live' ? { codeAccess } : { codeAccess, pairMode: 'off' },
                )
              }
            />
          }
        />
        <Row
          label="Learning history"
          labelFor={trackingId}
          help="Record problems you open and your practice activity locally, to power Progress. Never uploaded."
          control={
            <Switch
              id={trackingId}
              checked={settings.sessionTracking}
              onCheckedChange={(sessionTracking) => void update({ sessionTracking })}
            />
          }
        />
        <DeleteDataRow />
      </Section>

      <Section id="voice" title="Voice">
        <MicrophoneRow />
      </Section>

      <Section id={null} title="About">
        <p className="p-3 text-fg-secondary text-xs">
          Synora v{browser.runtime.getManifest().version}. Open source under the MIT license.
        </p>
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: SettingsSection | null;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id ? `settings-${id}` : undefined} className="flex scroll-mt-4 flex-col gap-3">
      <h2 className="font-medium text-[11px] text-fg-muted uppercase tracking-wider">{title}</h2>
      <div className="flex flex-col divide-y rounded-lg border bg-surface">{children}</div>
    </section>
  );
}

function Row({
  label,
  help,
  control,
  labelFor,
  stacked = false,
}: {
  label: string;
  help?: ReactNode;
  control: ReactNode;
  labelFor?: string;
  stacked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <div
        className={
          stacked ? 'flex flex-col gap-2' : 'flex flex-wrap items-center justify-between gap-3'
        }
      >
        <label htmlFor={labelFor} className="font-medium text-[13px] text-fg">
          {label}
        </label>
        {control}
      </div>
      {help && <p className="text-fg-secondary text-xs leading-relaxed">{help}</p>}
    </div>
  );
}

function DeleteDataRow() {
  const clearAllCode = useCodeStore((s) => s.clearAll);
  const records = useLiveQuery(() => countLearningRecords(db), [], 0);
  const [done, setDone] = useState(false);

  const onDelete = async () => {
    await deleteAllLearningData(db);
    clearAllCode();
    setDone(true);
  };

  return (
    <Row
      label="Delete all data"
      help={
        done
          ? 'All learning data was deleted.'
          : `Permanently removes your local learning history and conversations (${records} records). Settings and API keys are kept.`
      }
      control={
        <ConfirmDialog
          title="Delete all learning data?"
          description="This permanently removes your history, conversations, progress and captured code from this browser. It can't be undone."
          confirmLabel="Delete everything"
          onConfirm={onDelete}
          trigger={
            <Button variant="danger" size="sm" disabled={records === 0}>
              <Trash2 /> Delete
            </Button>
          }
        />
      }
    />
  );
}

const MIC_STATUS: Record<MicPermission, { label: string; tone: 'success' | 'error' | 'neutral' }> =
  {
    granted: { label: 'Allowed', tone: 'success' },
    denied: { label: 'Blocked', tone: 'error' },
    prompt: { label: 'Not set', tone: 'neutral' },
    unsupported: { label: 'Unknown', tone: 'neutral' },
  };

function MicrophoneRow() {
  const [permission, setPermission] = useState<MicPermission>('unsupported');
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => queryMicPermission().then(setPermission), []);

  useEffect(() => {
    void refresh();
    // The grant may happen in the permissions tab; re-check when the panel regains focus.
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const enable = async () => {
    setMessage(null);
    const result = await requestMicAccess();
    if (result.ok) {
      setMessage('Microphone access works in the side panel.');
    } else if (result.error === 'not-allowed') {
      setMessage('Chrome needs you to allow the microphone in a tab. Opening it now…');
      await openMicPermissionPage();
    } else {
      setMessage(result.message);
    }
    void refresh();
  };

  const status = MIC_STATUS[permission];
  return (
    <Row
      label="Microphone"
      help={
        message ??
        'Used only while Synora Live is listening. Audio is never stored. Chrome’s speech recognition may process audio on Google’s servers.'
      }
      control={
        <div className="flex items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          {permission !== 'granted' && (
            <Button size="sm" onClick={() => void enable()}>
              <Mic /> Enable
            </Button>
          )}
        </div>
      }
    />
  );
}
