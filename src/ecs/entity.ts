import { entityIndexBits, entityIndexMask } from './entity-layout.js';

// `Entity` is an alias rather than plain `number`, to name what a value is in
// signatures. Staying a number keeps every Map/Set keyed by entity, and every
// component field holding one, working unchanged.
/* eslint-disable sonarjs/redundant-type-aliases */
/**
 * A handle to an entity in an `EcsWorld`: a slot index and a generation,
 * packed into one number. The world reuses a removed entity's slot for a
 * later entity, but with the next generation, so a handle to a removed
 * entity never refers to the entity that took its slot. Treat it as opaque:
 * compare handles with `===` and store them, but don't do arithmetic on
 * them.
 */
export type Entity = number;
/* eslint-enable sonarjs/redundant-type-aliases */

/**
 * Gets the slot index of an entity handle.
 * @param entity - The entity handle.
 * @returns The slot index.
 */
export const entityIndex = (entity: Entity): number => entity & entityIndexMask;

/**
 * Gets the generation of an entity handle.
 * @param entity - The entity handle.
 * @returns The generation.
 */
export const entityGeneration = (entity: Entity): number =>
  entity >>> entityIndexBits;

/**
 * Formats an entity handle as its index and generation (e.g. `"12v3"` for
 * index 12, generation 3), for error messages and debugging.
 * @param entity - The entity handle.
 * @returns The formatted handle.
 */
export const formatEntity = (entity: Entity): string =>
  `${entityIndex(entity)}v${entityGeneration(entity)}`;
