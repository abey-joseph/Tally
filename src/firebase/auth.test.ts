import { describe, expect, it, vi } from 'vitest';

// Keep the test free of real Firebase initialisation.
vi.mock('./config', () => ({ getFirebase: () => ({}) }));
const { isAllowedEmail } = await import('./auth');

describe('isAllowedEmail', () => {
  it('matches the allowed email case-insensitively', () => {
    expect(isAllowedEmail('Me@Example.com', 'me@example.com')).toBe(true);
    expect(isAllowedEmail(' me@example.com ', 'ME@example.com ')).toBe(true);
  });

  it('denies other emails, missing emails and an empty allow-list', () => {
    expect(isAllowedEmail('someone@example.com', 'me@example.com')).toBe(false);
    expect(isAllowedEmail(null, 'me@example.com')).toBe(false);
    expect(isAllowedEmail('me@example.com', '')).toBe(false);
    expect(isAllowedEmail('', '')).toBe(false);
  });
});
