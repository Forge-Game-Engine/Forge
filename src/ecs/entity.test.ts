import { describe, expect, it } from 'vitest';
import { entityGeneration, entityIndex, formatEntity } from './entity.js';
import { createEntityHandle, maxEntities } from './entity-layout.js';

describe('entity handles', () => {
  it('packs and unpacks a slot index and a generation', () => {
    const entity = createEntityHandle(12, 3);

    expect(entityIndex(entity)).toBe(12);
    expect(entityGeneration(entity)).toBe(3);
  });

  it('numbers the first generation of a slot by its index', () => {
    expect(createEntityHandle(0, 0)).toBe(0);
    expect(createEntityHandle(7, 0)).toBe(7);
  });

  it('stays a small integer below 2^30 for the largest index and generation', () => {
    const entity = createEntityHandle(maxEntities - 1, 1023);

    expect(entity).toBeLessThan(2 ** 30);
    expect(entityIndex(entity)).toBe(maxEntities - 1);
    expect(entityGeneration(entity)).toBe(1023);
  });

  it('wraps the generation after 1,023', () => {
    expect(createEntityHandle(4, 1024)).toBe(createEntityHandle(4, 0));
  });

  it('formats a handle as its index and generation', () => {
    expect(formatEntity(createEntityHandle(12, 3))).toBe('12v3');
  });
});
