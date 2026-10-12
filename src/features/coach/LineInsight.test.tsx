import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LineFocus } from '../context/code-store';
import { LineInsight } from './LineInsight';

const focus = (lineText: string, word = ''): LineFocus => ({
  line: 4,
  lineText,
  word,
  source: 'hover',
  at: 0,
});

describe('LineInsight', () => {
  it('shows the line, local reference, and pitfalls', () => {
    render(
      <LineInsight
        focus={focus('        res = nums.sort()')}
        languageId="python"
        level="intermediate"
        busy={false}
        onAsk={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Line 4' })).toBeInTheDocument();
    expect(screen.getByText(/Possible pitfall: `.sort\(\)` returns None/)).toBeInTheDocument();
    expect(screen.getByText('list.sort')).toBeInTheDocument();
    expect(screen.getByText(/returns None, so `x = nums.sort\(\)`/)).toBeInTheDocument();
  });

  it('switches between reference entries', async () => {
    const user = userEvent.setup();
    render(
      <LineInsight
        focus={focus('for i, n in enumerate(nums):')}
        languageId="python"
        level="beginner"
        busy={false}
        onAsk={() => {}}
      />,
    );
    expect(screen.getByText('Loops over items together with their index.')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'for … in' }));
    expect(screen.getByText(/Runs the indented block once for each item/)).toBeInTheDocument();
  });

  it('asks line-scoped questions and supports explaining it back', async () => {
    const user = userEvent.setup();
    const onAsk = vi.fn();
    render(
      <LineInsight
        focus={focus('seen[n] = i')}
        languageId="python"
        level="beginner"
        busy={false}
        onAsk={onAsk}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Explain every part' }));
    expect(onAsk).toHaveBeenLastCalledWith(
      expect.objectContaining({
        display: 'Explain every part of line 4.',
        kind: 'action',
        action: 'line-basics',
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Explain it back' }));
    await user.type(
      screen.getByLabelText(/In your own words/),
      'stores where I saw each number{Enter}',
    );
    expect(onAsk).toHaveBeenLastCalledWith(
      expect.objectContaining({
        display: 'stores where I saw each number',
        action: 'line-explain-back',
      }),
    );
  });

  it('collapses', async () => {
    const user = userEvent.setup();
    render(
      <LineInsight
        focus={focus('x = len(nums)')}
        languageId="python"
        level="advanced"
        busy={false}
        onAsk={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Collapse line insight' }));
    expect(screen.queryByText(/Number of items/)).not.toBeInTheDocument();
  });
});
