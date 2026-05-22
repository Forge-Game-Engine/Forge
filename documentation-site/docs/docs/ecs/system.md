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
