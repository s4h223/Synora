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
import type { CodeAccess } from '@/lib/settings';
import {
  type MicPermission,
  openMicPermissionPage,
  queryMicPermission,
  requestMicAccess,
} from '@/lib/voice/mic-permission';
import { useCodeStore } from '../context/code-store';
import { useSettings } from './use-settings';

const CODE_ACCESS_OPTIONS: { value: CodeAccess; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'ask', label: 'Ask' },
  { value: 'auto', label: 'Auto' },
];

const CODE_ACCESS_HELP: Record<CodeAccess, string> = {
  off: 'Synora never reads your editor. You can still paste code manually.',
  ask: 'Synora reads your editor only when you click “Read from editor”.',
  auto: 'Synora reads your editor automatically when you ask an AI feature for help.',
};

export function SettingsView() {
  const { settings, update } = useSettings();
  const trackingId = useId();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 animate-fade-in">
      <Section title="Privacy">
        <Row
          label="Editor code access"
          help={CODE_ACCESS_HELP[settings.codeAccess]}
          control={
            <SegmentedControl
              aria-label="Editor code access"
              value={settings.codeAccess}
              options={CODE_ACCESS_OPTIONS}
              onValueChange={(codeAccess) => void update({ codeAccess })}
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

      <Section title="Voice">
        <MicrophoneRow />
      </Section>

      <Section title="About">
        <p className="text-fg-secondary text-xs">
          Synora v{browser.runtime.getManifest().version}. Open source under the MIT license.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
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
}: {
  label: string;
  help?: ReactNode;
  control: ReactNode;
  labelFor?: string;
}) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={labelFor} className="font-medium text-fg text-[13px]">
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
          : `Permanently removes your local learning history (${records} records). Settings are kept.`
      }
      control={
        <ConfirmDialog
          title="Delete all learning data?"
          description="This permanently removes your history, progress and captured code from this browser. It can't be undone."
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
