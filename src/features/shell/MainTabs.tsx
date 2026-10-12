import { AudioLines, BarChart3, type LucideIcon, MessageSquareText, Swords } from 'lucide-react';
import { Tabs } from 'radix-ui';
import { ChallengeTab } from '../challenge/ChallengeTab';
import { CoachTab } from '../coach/CoachTab';
import { LiveTab } from '../live/LiveTab';
import { ProgressTab } from '../progress/ProgressTab';
import { type TabId, useUiStore } from './ui-store';

const TABS: { id: TabId; label: string; icon: LucideIcon; Panel: () => React.JSX.Element }[] = [
  { id: 'coach', label: 'Coach', icon: MessageSquareText, Panel: CoachTab },
  { id: 'live', label: 'Live', icon: AudioLines, Panel: LiveTab },
  { id: 'challenge', label: 'Challenge', icon: Swords, Panel: ChallengeTab },
  { id: 'progress', label: 'Progress', icon: BarChart3, Panel: ProgressTab },
];

export function MainTabs() {
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);

  return (
    <Tabs.Root
      value={tab}
      onValueChange={(value) => setTab(value as TabId)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <Tabs.List
        aria-label="Synora sections"
        className="flex shrink-0 gap-0.5 border-b bg-bg px-2 @container"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <Tabs.Trigger
            key={id}
            value={id}
            aria-label={label}
            className="group relative flex h-9 flex-1 items-center justify-center gap-1.5 text-fg-muted text-xs font-medium transition-colors hover:text-fg-secondary data-[state=active]:text-fg"
          >
            <Icon className="size-4 group-data-[state=active]:text-accent" aria-hidden />
            {/* Labels collapse to icon-only in very narrow panels. */}
            <span className="hidden @[300px]:inline">{label}</span>
            <span
              aria-hidden
              className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent opacity-0 transition-opacity group-data-[state=active]:opacity-100"
            />
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {TABS.map(({ id, Panel }) => (
        <Tabs.Content
          key={id}
          value={id}
          className="min-h-0 flex-1 overflow-y-auto focus-visible:outline-none"
        >
          <Panel />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
