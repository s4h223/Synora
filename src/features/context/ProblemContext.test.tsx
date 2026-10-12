import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ProblemState } from '@/lib/leetcode/active-problem';
import type { Problem } from '@/lib/leetcode/types';
import { ProblemContextBody } from './ProblemContext';

const problem: Problem = {
  id: '1',
  frontendId: '1',
  slug: 'two-sum',
  title: 'Two Sum',
  url: 'https://leetcode.com/problems/two-sum/',
  difficulty: 'Easy',
  isPaidOnly: false,
  description: 'desc',
  constraints: [],
  exampleInputs: [],
  tags: ['Array', 'Hash Table', 'Sorting', 'Two Pointers', 'Greedy'].map((name) => ({
    name,
    slug: name.toLowerCase().replace(' ', '-'),
  })),
  signature: null,
  solvedStatus: null,
  source: 'graphql',
};

function renderState(state: ProblemState) {
  return render(
    <TooltipProvider>
      <ProblemContextBody state={state} />
    </TooltipProvider>,
  );
}

describe('ProblemContextBody', () => {
  it('shows the problem title, difficulty and the first tags', () => {
    renderState({ status: 'ready', problem, tabId: 1 });
    expect(screen.getByRole('heading', { name: /^1\.\s*Two Sum$/ })).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Sorting')).toBeInTheDocument();
    expect(screen.queryByText('Two Pointers')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add code' })).toBeInTheDocument();
  });

  it('flags premium problems without a description', () => {
    renderState({
      status: 'ready',
      problem: { ...problem, isPaidOnly: true, description: null },
      tabId: 1,
    });
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText(/Description unavailable/)).toBeInTheDocument();
  });

  it('prompts to open a problem', () => {
    renderState({ status: 'no-problem', reason: 'not-leetcode' });
    expect(screen.getByText('Open a LeetCode problem to get started.')).toBeInTheDocument();
  });

  it('explains that Synora is off during contests', () => {
    renderState({ status: 'no-problem', reason: 'contest' });
    expect(screen.getByText('Synora is turned off during contests.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers reload when disconnected and retry on error', () => {
    const { unmount } = renderState({ status: 'disconnected', slug: 'two-sum', tabId: 1 });
    expect(screen.getByRole('button', { name: /Reload/ })).toBeInTheDocument();
    unmount();

    renderState({ status: 'error', slug: 'two-sum', tabId: 1, message: 'HTTP 429' });
    expect(screen.getByText('HTTP 429')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });
});
