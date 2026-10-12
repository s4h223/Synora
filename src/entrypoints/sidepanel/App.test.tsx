import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { useUiStore } from '@/features/shell/ui-store';
import { getSettings, updateSettings } from '@/lib/settings';
import { App } from './App';

beforeEach(async () => {
  fakeBrowser.reset();
  useUiStore.setState({ view: 'main', tab: 'coach', settingsSection: null });
  // fake-browser doesn't implement getManifest.
  vi.spyOn(fakeBrowser.runtime, 'getManifest').mockReturnValue({
    manifest_version: 3,
    name: 'Synora',
    version: '0.0.0-test',
  });
});

describe('App', () => {
  it('walks a new user through onboarding', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'How much coding experience do you have?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /I’m new to this/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    expect(
      screen.getByRole('heading', { name: 'How should Synora see your code?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Follow along as I type/ }));
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    await user.click(screen.getByRole('button', { name: 'Later' }));
    expect(await screen.findByRole('tab', { name: 'Coach' })).toBeInTheDocument();

    expect(await getSettings()).toMatchObject({
      experienceLevel: 'beginner',
      codeAccess: 'live',
      onboardingComplete: true,
    });
  });

  describe('after onboarding', () => {
    beforeEach(async () => {
      await updateSettings({ onboardingComplete: true });
    });

    it('renders the shell with all four sections', async () => {
      render(<App />);
      expect(await screen.findByRole('tab', { name: 'Coach' })).toBeInTheDocument();
      for (const name of ['Live', 'Challenge', 'Progress']) {
        expect(screen.getByRole('tab', { name })).toBeInTheDocument();
      }
      expect(
        await screen.findByText('Open a LeetCode problem to get started.'),
      ).toBeInTheDocument();
    });

    it('opens settings and persists changes', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: 'Settings' }));
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByLabelText('Provider')).toBeInTheDocument();

      const codeAccess = screen.getByRole('radiogroup', { name: 'Editor code access' });
      await waitFor(() =>
        expect(within(codeAccess).getByRole('radio', { name: 'Ask' })).toBeChecked(),
      );
      await user.click(within(codeAccess).getByRole('radio', { name: 'Live' }));
      await waitFor(async () => expect((await getSettings()).codeAccess).toBe('live'));

      const pair = screen.getByRole('radiogroup', { name: 'Pair mode' });
      await user.click(within(pair).getByRole('radio', { name: 'Quiet' }));
      await waitFor(async () => expect((await getSettings()).pairMode).toBe('quiet'));

      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByRole('tab', { name: 'Coach' })).toBeInTheDocument();
    });

    it('turning code access off also turns Pair mode off', async () => {
      await updateSettings({ codeAccess: 'live', pairMode: 'active' });
      const user = userEvent.setup();
      render(<App />);
      await user.click(await screen.findByRole('button', { name: 'Settings' }));

      const codeAccess = screen.getByRole('radiogroup', { name: 'Editor code access' });
      await waitFor(() =>
        expect(within(codeAccess).getByRole('radio', { name: 'Live' })).toBeChecked(),
      );
      await user.click(within(codeAccess).getByRole('radio', { name: 'Off' }));
      await waitFor(async () =>
        expect(await getSettings()).toMatchObject({ codeAccess: 'off', pairMode: 'off' }),
      );
    });
  });
});
