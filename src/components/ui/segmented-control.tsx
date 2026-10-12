import { ToggleGroup } from 'radix-ui';
import { cn } from '@/lib/utils';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onValueChange(value: T): void;
  'aria-label': string;
  className?: string;
}

/** Single-select pill group (radio semantics, arrow-key navigation via Radix). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onValueChange,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onValueChange(next as T)}
      className={cn('inline-flex rounded-md border bg-surface p-0.5', className)}
      {...aria}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className="h-6 rounded-[5px] px-2.5 font-medium text-fg-secondary text-xs transition-colors hover:text-fg data-[state=on]:bg-elevated data-[state=on]:text-fg data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-border)]"
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
