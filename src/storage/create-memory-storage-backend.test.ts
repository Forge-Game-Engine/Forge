import { describe, expect, it } from 'vitest';
import { createMemoryStorageBackend } from './create-memory-storage-backend';

describe('createMemoryStorageBackend', () => {
  it('returns null for a key that was never stored', async () => {
    const backend = createMemoryStorageBackend();

    await expect(backend.get('missing')).resolves.toBeNull();
  });

  it('round-trips a stored value', async () => {
    const backend = createMemoryStorageBackend();

    await backend.set('key', 'value');

    await expect(backend.get('key')).resolves.toBe('value');
  });

  it('removes a stored value, and resolves when nothing was stored', async () => {
    const backend = createMemoryStorageBackend();

    await backend.set('key', 'value');
    await backend.remove('key');

    await expect(backend.get('key')).resolves.toBeNull();
    await expect(backend.remove('missing')).resolves.toBeUndefined();
  });

  it('shares nothing between two backends', async () => {
    const first = createMemoryStorageBackend();
    const second = createMemoryStorageBackend();

    await first.set('key', 'value');

    await expect(second.get('key')).resolves.toBeNull();
  });
});
