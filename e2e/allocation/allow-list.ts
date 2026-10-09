import type { AllowedAllocator } from './measure-allocations.js';

// Every function the 2D stress scenes allocate in each frame today, grouped
// by subsystem. Each entry says what allocates and what change removes it;
// that change deletes the entry. A spec whose run no longer hits an entry
// notes it as an "unused allow-list entry". Never add an entry for new
// code: a new per-frame system ships allocating nothing.

/** The frame clock. */
export const frameClockAllocators: readonly AllowedAllocator[] = [
  {
    file: 'src/common/time/Time.ts',
    functionName: 'update',
    reason:
      'Keeps the last second of frame timestamps for `fps` in an array it shifts and pushes every frame. Removed by keeping them in a fixed-size ring buffer.',
  },
];

/** The ECS world's queries and system schedule. */
export const ecsAllocators: readonly AllowedAllocator[] = [
  {
    file: 'src/ecs/ecs-world.ts',
    functionName: 'query',
    reason:
      'Builds new entity and component arrays on every call, including the query `update` runs for each system every tick. Removed by queries the world declares once and keeps up to date.',
  },
  {
    file: 'src/ecs/ecs-world.ts',
    functionName: 'update',
    chargedOnly: true,
    reason:
      'Rebuilds the ordered list of groups and systems every tick, and V8 charges `query` to it where `query` is inlined into it. Removed with the query entry, and by sorting the schedule only when systems are added or removed.',
  },
  {
    file: 'src/ecs/ecs-world.ts',
    functionName: '_getOrderedGroups',
    chargedOnly: true,
    reason:
      'The per-tick schedule rebuild (see `update`), where V8 does not inline it. Removed by sorting the schedule only when systems change.',
  },
  {
    file: 'src/ecs/ecs-world.ts',
    functionName: '(anonymous)',
    chargedOnly: true,
    reason:
      "The callback `_getOrderedGroups` maps each group through every tick, building the group's entry. Removed with `_getOrderedGroups`'s entry.",
  },
  {
    file: 'src/utilities/directed-acyclic-graph.ts',
    functionName: 'topologicalSort',
    reason:
      "Sorts the system groups and each group's systems into new arrays, called by the per-tick schedule rebuild. Removed with `_getOrderedGroups`'s entry.",
  },
];

/**
 * Systems that destructure their query result (`{ components: [a, b] }`)
 * and do so little work per frame that V8 doesn't optimize them, so each
 * call allocates the array iterator the destructuring uses. Removed when
 * systems read their query result without destructuring it, or by
 * whatever change to the query result removes the iterator.
 */
export const queryDestructuringAllocators: readonly AllowedAllocator[] = [
  {
    file: 'src/rendering/systems/camera-system.ts',
    functionName: 'update',
    reason:
      "Allocates the array iterator its query result's destructuring uses; the system does nothing else for a static camera.",
  },
  {
    file: 'src/ui/systems/ui-progress-bar-system.ts',
    functionName: 'update',
    reason:
      "Allocates the array iterator its query result's destructuring uses, even with no progress bars.",
  },
];

/** The transform system. */
export const transformSystemAllocators: readonly AllowedAllocator[] = [
  {
    file: 'src/common/systems/transform-system.ts',
    functionName: 'update',
    reason:
      'Refills a `Set` of the entities it has computed every tick, which grows its table again after each `clear`, and clones a vector per child to compose it with its parent. Removed by the transform rewrite that propagates in hierarchy order into preallocated storage.',
  },
];

/** Drawing: the render and present systems. */
export const renderSystemAllocators: readonly AllowedAllocator[] = [
  {
    file: 'src/rendering/systems/render-system.ts',
    functionName: 'update',
    reason:
      "The render system's per-quad and per-frame allocations: a command object per sprite, nine-slice region and glyph (`pushSpriteRenderCommands`, `pushTextRenderCommands`), the stacks the draw-order resolver walks the hierarchy with, the camera view and projection matrix, a uniform upload closure per batch (`Material.setUniform`), the optional-component accessors, and its `world.query` calls. Removed by the sprite renderer rewrite that writes instance data straight from components into preallocated buffers.",
  },
  {
    file: 'src/rendering/systems/present-system.ts',
    functionName: 'update',
    reason:
      'Builds a new `Set` of the render targets it has seen and a new array of present commands every frame. Removed by keeping both on the system and clearing them each frame.',
  },
];

/** Text shaping. */
export const textAllocators: readonly AllowedAllocator[] = [
  {
    file: 'src/text/systems/text-shaping-system.ts',
    functionName: 'update',
    reason:
      "Builds a snapshot object of every text's shaping inputs every frame to detect changes, and shapes a changed text into new glyph, line and caret arrays (`shapeText`). Removed by tracking changes without a snapshot and shaping into the text mesh's existing arrays.",
  },
];

/** The UI layout, canvas group and text input systems. */
export const uiAllocators: readonly AllowedAllocator[] = [
  {
    file: 'src/ui/systems/ui-layout-system.ts',
    functionName: 'update',
    reason:
      'Builds `new Set(entities)` and a roots array every tick, and new rect and vector objects for every element it resolves (`resolveEntityRect`, `pivotPositionOf`). Removed by the UI layout rewrite.',
  },
  {
    file: 'src/ui/systems/ui-layout-group-system.ts',
    functionName: 'update',
    reason:
      'Builds a `new Map` measure cache, filtered child lists and per-child measure and rect arrays for every layout group every tick (`measure`, `arrangeGrid`, `arrangeableChildrenOf`). Removed by the UI layout rewrite.',
  },
  {
    file: 'src/ui/systems/ui-canvas-group-system.ts',
    functionName: 'update',
    reason:
      'Builds `new Set(entities)` every tick and walks the hierarchy with per-visit allocations (`visit`). Removed by the UI layout rewrite.',
  },
  {
    file: 'src/ui/systems/ui-text-input-system.ts',
    functionName: 'update',
    reason:
      "Builds a hit array, a `world.query` result and a `new Set` of current fields (to find removed fields) every tick. Removed by keeping each field's state in components, so removed fields come from the ECS's record of removals.",
  },
];

/** Particles, which are entities today. */
export const particleAllocators: readonly AllowedAllocator[] = [
  {
    file: 'src/particles/systems/particle-emitter-system.ts',
    functionName: 'update',
    reason:
      'Spawns every particle as an entity with its own components (`spawnParticle`). Removed by simulating particles in arrays owned by their emitter instead of as entities.',
  },
  {
    file: 'src/lifecycle/systems/remove-from-world-lifecycle-system.ts',
    functionName: 'update',
    reason:
      "Removes every expired particle's entity, raising `onEntityRemoved` for each. Removed with the emitter entry.",
  },
  {
    file: 'src/particles/systems/particle-position-system.ts',
    functionName: 'update',
    reason:
      "Allocates the array iterator its query result's destructuring uses. Removed with the emitter entry, when particles are no longer entities.",
  },
];
