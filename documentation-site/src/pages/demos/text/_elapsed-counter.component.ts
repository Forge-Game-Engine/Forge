import { createTagId } from '@forge-game-engine/forge/ecs';

/**
 * Marks a text entity whose `text` `createElapsedCounterEcsSystem`
 * (`_elapsed-counter.system.ts`) updates every frame with the demo's
 * elapsed time - showcasing that updating `TextEcsComponent.text` is cheap,
 * since `createTextShapingEcsSystem` only re-shapes glyphs for entities
 * whose text (or another shape-affecting field) actually changed.
 */
export const elapsedCounterTag = createTagId('elapsedCounter');
