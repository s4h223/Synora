import { cn } from './utils';

describe('cn', () => {
  it('joins conditional classes', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('lets later Tailwind classes override earlier ones', () => {
    expect(cn('px-2 text-fg', 'px-4')).toBe('text-fg px-4');
  });
});
