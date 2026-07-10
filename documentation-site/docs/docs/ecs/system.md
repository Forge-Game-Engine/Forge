---
sidebar_position: 5
---

# System

A system is a plain object that declares a `query` (an array of component keys), an optional set of `tags`, and a `run` method. The `run` method is called for each matching entity and receives a `QueryResult` object and the `EcsWorld` instance.

Optional `beforeQuery(world)` can return a value that will be passed to `run` as `beforeQueryResult` for every matching entity (useful for expensive, shared pre-computations).

Example:


```ts
const movementSystem = {
  query: [Position, Velocity] as const,
  beforeQuery(world) {
    // compute something once per frame if needed
    return null;
  },
  run(result, world, _before) {
    const [pos, vel] = result.components as [{ x: number; y: number }, { x: number; y: number }];
    pos.x += vel.x;
    pos.y += vel.y;
  },
};

world.addSystem(movementSystem);
```

## Preprocessing

Systems may implement an optional `beforeQuery(world)` method. It is invoked once per tick before entity iteration and may return a value that will be passed to `run` as `beforeQueryResult` for every matching entity. Use this to compute expensive, shared data (for example spatial queries or cached lookups) that would be wasteful to recompute per entity. Keep preprocessing fast and preferably side-effect free.

## Atomicity

Treat each call to `run(result, world, beforeQueryResult)` as a single, focused update for the matched entity. Systems should perform short, deterministic operations and avoid long-running or blocking work inside `run`.

Mutations to world state (adding or removing components or entities) take effect immediately and may be visible to subsequent systems or later iterations. Because of this, do not rely on implicit ordering between systems for coordination; prefer explicit events or deferred work when systems need to coordinate complex state changes.

## Postprocessing the whole tick's results: afterRun

Systems may implement an optional `afterRun(inputs)` method. It is invoked once per tick, after `run` has finished running for every matched entity, with an array of every one of those calls' return values, in query order (empty if nothing matched). It is a genuine once-per-tick hook: all of `run` happens first, then `afterRun` runs exactly once, never interleaved with `run` on a per-entity basis.

This matters for systems whose real work depends on seeing the whole tick's entities together, not just one at a time, most notably the render system: each camera entity's `run` computes that camera's projection matrix and gathers the sprites it should draw into its own command list, and `afterRun` draws every camera's batch once all of them are known, from a single, predictable pass over the results.

```ts
interface RenderPassResult {
  projectionMatrix: Matrix3x3;
  target: RenderTarget | null;
  commands: RenderCommand[];
}

const system: EcsSystem<[Camera], null, RenderPassResult> = {
  query: [Camera],
  run(result) {
    // ...compute this camera's pass, don't draw anything yet...
    return { projectionMatrix, target, commands };
  },
  afterRun(results) {
    for (const { projectionMatrix, target, commands } of results) {
      // ...draw each camera's pass, now that every camera is known...
    }
  },
};
```

If a system doesn't need this, leave off `afterRun` entirely and don't return anything from `run`; the corresponding type parameter defaults to `void`, so `run` can end without an explicit `return` statement like any other `(...): void` function.

## Releasing resources when the world stops: cleanupEntities

Systems may implement an optional `cleanupEntities(queryResult, world)` method. It runs once for every entity still matching the system's `query` (and `tags`) when the owning world is stopped, most commonly because a [`Game`](./game.md) was stopped. It is not called per-tick, only on shutdown, so it's the place to release resources the system itself acquired for an entity, resources that a component's own lifecycle doesn't already handle.

```ts
const audioSystem: EcsSystem<[AudioComponent]> = {
  query: [Audio],
  run(result) {
    const [audio] = result.components;

    if (audio.playSound) {
      audio.sound.play();
      audio.playSound = false;
    }
  },
  cleanupEntities(result) {
    const [audio] = result.components;

    if (audio.sound.playing()) {
      audio.sound.stop();
      audio.sound.unload();
    }
  },
};
```

Other systems use `cleanupEntities` to remove a physics body from the physics world, or to dispose scratch GPU render targets that a system allocates outside of any component (see the gaussian blur system for an example of the latter). If a system doesn't acquire any per-entity resources, leave `cleanupEntities` off.
