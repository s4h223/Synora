import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { getSettings } from '@/lib/settings';
import { App } from './App';

beforeEach(() => {
  fakeBrowser.reset();
  // fake-browser doesn't implement getManifest.
  vi.spyOn(fakeBrowser.runtime, 'getManifest').mockReturnValue({
    manifest_version: 3,
    name: 'Synora',
    version: '0.0.0-test',
  });
});

describe('App', () => {
  it('renders the shell with all four sections', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Synora' })).toBeInTheDocument();
    for (const name of ['Coach', 'Live', 'Challenge', 'Progress']) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    }
    expect(await screen.findByText('Open a LeetCode problem to get started.')).toBeInTheDocument();
  });

  it('opens and closes settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    const codeAccess = screen.getByRole('radiogroup', { name: 'Editor code access' });
    expect(within(codeAccess).getByRole('radio', { name: 'Ask' })).toBeChecked();

    await user.click(within(codeAccess).getByRole('radio', { name: 'Off' }));
    await waitFor(async () => expect((await getSettings()).codeAccess).toBe('off'));

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('tab', { name: 'Coach' })).toBeInTheDocument();
  });
});
