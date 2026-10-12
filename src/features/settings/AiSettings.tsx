import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPreset, type ProviderId, visibleProviders } from '@/lib/ai/catalog';
import {
  aiConfigItem,
  getAiConfig,
  type ProviderSettings,
  resolveActiveProvider,
  saveProviderSettings,
} from '@/lib/ai/config';
import { createProvider } from '@/lib/ai/create-provider';
import { requestHostAccess } from '@/lib/ai/permissions';
import { AiError } from '@/lib/ai/types';
import { useAiConfig } from './use-ai-config';

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; message: string }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

const COST_BADGE = {
  paid: { label: 'Paid', tone: 'neutral' },
  'free-tier': { label: 'Free tier', tone: 'success' },
  local: { label: 'Local', tone: 'accent' },
} as const;

export function AiSettings() {
  const { config, loaded, resolved } = useAiConfig();
  const [providerId, setProviderId] = useState<ProviderId>('anthropic');
  const [draft, setDraft] = useState<ProviderSettings>({});
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const ids = {
    provider: useId(),
    key: useId(),
    baseUrl: useId(),
    model: useId(),
    models: useId(),
  };

  // Start on the active provider once config loads.
  useEffect(() => {
    if (loaded && config.activeProvider) setProviderId(config.activeProvider);
  }, [loaded, config.activeProvider]);

  // Load the saved draft whenever the selected provider changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset on provider switch
  useEffect(() => {
    const preset = getPreset(providerId);
    const saved = config.providers[providerId] ?? {};
    setDraft({
      apiKey: saved.apiKey ?? '',
      baseUrl: saved.baseUrl ?? preset.defaultBaseUrl ?? '',
      model: saved.model ?? preset.suggestedModels[0] ?? '',
    });
    setModels(preset.suggestedModels);
    setStatus({ kind: 'idle' });
  }, [providerId, loaded]);

  const preset = getPreset(providerId);
  const baseUrl = (preset.baseUrl ?? draft.baseUrl ?? '').trim();
  const cost = COST_BADGE[preset.cost];

  /** Must run synchronously inside the click handler (Chrome needs the user gesture). */
  const askPermission = (): Promise<boolean> =>
    providerId === 'demo' ? Promise.resolve(true) : requestHostAccess(baseUrl);

  const loadModels = () => {
    const permission = askPermission();
    void (async () => {
      if (!(await permission)) return setStatus(permissionDenied(baseUrl));
      setStatus({ kind: 'working', message: 'Loading models…' });
      try {
        const provider = createProvider({
          id: providerId,
          protocol: preset.protocol,
          baseUrl,
          apiKey: draft.apiKey?.trim() || undefined,
          model: draft.model || 'unused',
        });
        const list = (await provider.listModels?.()) ?? [];
        setModels(list.length ? list : preset.suggestedModels);
        setStatus({ kind: 'ok', message: `Found ${list.length} models.` });
      } catch (error) {
        setStatus({ kind: 'error', message: describe(error) });
      }
    })();
  };

  const saveAndTest = () => {
    const permission = askPermission();
    void (async () => {
      if (!(await permission)) return setStatus(permissionDenied(baseUrl));
      const settings: ProviderSettings = {
        apiKey: draft.apiKey?.trim() ?? '',
        baseUrl: draft.baseUrl?.trim() ?? '',
        model: draft.model?.trim() ?? '',
      };
      const next = await saveProviderSettings(providerId, settings);
      const active = resolveActiveProvider(next);
      if (!active) {
        return setStatus({
          kind: 'error',
          message: preset.requiresKey && !settings.apiKey ? 'Enter an API key.' : 'Choose a model.',
        });
      }
      setStatus({ kind: 'working', message: 'Testing connection…' });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      try {
        let reply = '';
        await createProvider(active).streamChat(
          {
            system: 'This is a connection test.',
            messages: [{ role: 'user', content: 'Reply with only the word: ready' }],
            signal: controller.signal,
          },
          { onText: (t) => (reply += t) },
        );
        setStatus({
          kind: 'ok',
          message: `Connected to ${preset.label} · ${active.model}${reply.trim() ? '' : ' (empty reply)'}`,
        });
      } catch (error) {
        setStatus({ kind: 'error', message: describe(error) });
      } finally {
        clearTimeout(timeout);
      }
    })();
  };

  const remove = async () => {
    const current = await getAiConfig();
    const { [providerId]: _removed, ...rest } = current.providers;
    await aiConfigItem.setValue({
      activeProvider: current.activeProvider === providerId ? null : current.activeProvider,
      providers: rest,
    });
    setDraft({
      apiKey: '',
      baseUrl: preset.defaultBaseUrl ?? '',
      model: preset.suggestedModels[0] ?? '',
    });
    setStatus({ kind: 'ok', message: 'Removed.' });
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.provider} className="font-medium text-[13px] text-fg">
          Provider
        </label>
        <select
          id={ids.provider}
          value={providerId}
          onChange={(e) => setProviderId(e.target.value as ProviderId)}
          className="h-8 rounded-md border bg-elevated px-2 text-[13px] text-fg"
        >
          {visibleProviders().map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <div className="flex items-start gap-2">
          <Badge tone={cost.tone}>{cost.label}</Badge>
          <p className="text-fg-secondary text-xs leading-relaxed">{preset.note}</p>
        </div>
        {preset.freeTierWarning && (
          <p className="text-warning text-xs leading-relaxed">
            Free tiers may use what you send (including your code) to improve their models. Check
            the provider's terms.
          </p>
        )}
        {providerId === 'ollama' && (
          <p className="text-fg-secondary text-xs leading-relaxed">
            If the test fails with “forbidden”, restart Ollama with{' '}
            <code className="rounded bg-elevated px-1 font-mono">
              OLLAMA_ORIGINS=chrome-extension://*
            </code>
            .
          </p>
        )}
      </div>

      {preset.baseUrl === null && (
        <Field id={ids.baseUrl} label="Server URL">
          <input
            id={ids.baseUrl}
            value={draft.baseUrl ?? ''}
            onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
            spellCheck={false}
            className={INPUT}
          />
        </Field>
      )}

      {(preset.requiresKey || preset.id === 'custom') && (
        <Field
          id={ids.key}
          label={preset.requiresKey ? 'API key' : 'API key (optional)'}
          aside={
            preset.keyUrl && (
              <a
                href={preset.keyUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-accent text-xs"
              >
                Get a key <ExternalLink className="size-3" />
              </a>
            )
          }
        >
          <div className="relative">
            <input
              id={ids.key}
              type={showKey ? 'text' : 'password'}
              value={draft.apiKey ?? ''}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              autoComplete="off"
              spellCheck={false}
              className={`${INPUT} pr-9`}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-fg-muted hover:text-fg"
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-fg-muted text-xs">
            Stored only in this browser. Never synced or uploaded to Synora.
          </p>
        </Field>
      )}

      <Field
        id={ids.model}
        label="Model"
        aside={
          <button
            type="button"
            onClick={loadModels}
            className="inline-flex items-center gap-1 text-accent text-xs"
          >
            <RefreshCw className="size-3" /> Load models
          </button>
        }
      >
        <input
          id={ids.model}
          list={ids.models}
          value={draft.model ?? ''}
          onChange={(e) => setDraft({ ...draft, model: e.target.value })}
          placeholder={preset.suggestedModels.length ? undefined : 'Load models or type a model id'}
          spellCheck={false}
          className={INPUT}
        />
        <datalist id={ids.models}>
          {models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Field>

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={saveAndTest} disabled={status.kind === 'working'}>
          Save & test
        </Button>
        {config.providers[providerId] && (
          <Button variant="ghost" onClick={() => void remove()}>
            <Trash2 /> Remove
          </Button>
        )}
      </div>

      <StatusLine status={status} />
      {resolved && status.kind === 'idle' && (
        <p className="text-fg-secondary text-xs">
          Active: {getPreset(resolved.id).label} · {resolved.model}
        </p>
      )}
    </div>
  );
}

const INPUT =
  'h-8 w-full rounded-md border bg-bg px-2.5 font-mono text-[12px] text-fg placeholder:font-sans placeholder:text-fg-muted focus-visible:border-accent/60';

function Field({
  id,
  label,
  aside,
  children,
}: {
  id: string;
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="font-medium text-[13px] text-fg">
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle') return null;
  const styles = {
    working: { Icon: Loader2, className: 'text-fg-secondary', spin: true },
    ok: { Icon: CheckCircle2, className: 'text-success', spin: false },
    error: { Icon: XCircle, className: 'text-error', spin: false },
  }[status.kind];
  return (
    <p role="status" className={`flex items-start gap-1.5 text-xs ${styles.className}`}>
      <styles.Icon className={`mt-px size-3.5 shrink-0 ${styles.spin ? 'animate-spin' : ''}`} />
      {status.message}
    </p>
  );
}

function permissionDenied(baseUrl: string): Status {
  return baseUrl.startsWith('http://') && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl)
    ? { kind: 'error', message: 'Remote servers must use https://.' }
    : { kind: 'error', message: 'Synora needs permission to contact this provider.' };
}

function describe(error: unknown): string {
  if (error instanceof AiError)
    return error.detail ? `${error.message} (${error.detail})` : error.message;
  return error instanceof Error ? error.message : String(error);
}
