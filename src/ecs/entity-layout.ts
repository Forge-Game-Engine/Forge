import { Entity } from './entity.js';

// How an entity handle is packed: the low 20 bits are its slot index, the
// next 10 its slot's generation. 30 bits in all, so every handle stays below
// 2^30 and V8 keeps it a small integer rather than a heap number, which
// keeps the Maps and Sets keyed by entity that systems rebuild every frame
// from allocating.
export const entityIndexBits = 20;
export const entityIndexMask = (1 << entityIndexBits) - 1;
export const entityGenerationMask = (1 << 10) - 1;

/**
 * The number of entity slots a world can hold at once.
 */
export const maxEntities = entityIndexMask + 1;

/**
 * Packs a slot index and a generation into an entity handle. The generation
 * wraps after 1,023.
 * @param index - The entity's slot index, below {@link maxEntities}.
 * @param generation - The slot's generation.
 * @returns The entity handle.
 */
export const createEntityHandle = (index: number, generation: number): Entity =>
  ((generation & entityGenerationMask) << entityIndexBits) | index;
