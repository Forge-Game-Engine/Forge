import { entityIndexBits, entityIndexMask } from './entity-layout.js';

// An entity is a handle: a slot index and a generation packed into one
// number. The world reuses a removed entity's slot for a later entity, but
// with the next generation, so a handle to a removed entity never refers to
// the entity that took its slot. Treat it as opaque: compare handles with
// `===` and store them, but don't do arithmetic on them.

/**
 * Gets the slot index of an entity handle.
 * @param entity - The entity handle.
 * @returns The slot index.
 */
export const entityIndex = (entity: number): number => entity & entityIndexMask;

/**
 * Gets the generation of an entity handle.
 * @param entity - The entity handle.
 * @returns The generation.
 */
export const entityGeneration = (entity: number): number =>
  entity >>> entityIndexBits;

/**
 * Formats an entity handle as its index and generation (e.g. `"12v3"` for
 * index 12, generation 3), for error messages and debugging.
 * @param entity - The entity handle.
 * @returns The formatted handle.
 */
export const formatEntity = (entity: number): string =>
  `${entityIndex(entity)}v${entityGeneration(entity)}`;
