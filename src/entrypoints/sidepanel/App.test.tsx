import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the Synora heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Synora' })).toBeInTheDocument();
  });
});
