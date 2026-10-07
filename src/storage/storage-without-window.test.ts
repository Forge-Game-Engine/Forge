// @vitest-environment node
import { describe, expect, it } from 'vitest';

describe('the storage module where there is no window', () => {
  it('imports and creates backends without throwing', async () => {
    expect(typeof globalThis.window).toBe('undefined');

    const storage = await import('./index');

    expect(() => storage.createLocalStorageBackend()).not.toThrow();
  });
});
