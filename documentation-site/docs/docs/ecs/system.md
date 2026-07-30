---
sidebar_position: 5
---

# System

A system is a plain object that declares a `query` (an array of component keys), an optional set of `tags`, and an `update` method. `update` is called once per tick with every entity currently matching `query` (and `tags`), batched together: an `entities` array of matched entity ids, and a `components` array holding one array per queried component type (in query order), so `components[0][i]` is the component at `query[0]` for `entities[i]`.

Example:

```ts
const movementSystem = {
  query: [Position, Velocity] as const,
  update(world, { entities, components: [positions, velocities] }) {
    for (let i = 0; i < entities.length; i++) {
      positions[i].x += velocities[i].x;
      positions[i].y += velocities[i].y;
    }
  },
};

world.addSystem(movementSystem);
```

## Batching, not per-entity dispatch

Unlike some ECS designs, `update` is a single call per tick, not one call per matched entity - the system is responsible for iterating `entities`/`components` itself. This makes cross-entity work (spatial partitioning, sorting, batching draw calls, or anything else that needs to see the whole tick's matches together) straightforward, since there's no separate "preprocess" or "postprocess" hook to reach for: it all happens in the body of `update`.

For example, the render system gathers every camera's sprite commands and computes its projection matrix in the same `update` call that ultimately issues that camera's draw calls, once all of the tick's cameras are known:

```ts
const system: EcsSystem<[Camera]> = {
  query: [Camera],
  update(world, { components: [cameras] }) {
    for (const camera of cameras) {
      // ...compute this camera's pass and issue its draw calls...
    }
  },
};
```

If a system needs to run some logic exactly once per tick regardless of how many entities match (or even when nothing matches), just do that work directly in `update` rather than per matched entity - `update` already runs exactly once per tick, whether `entities` has zero, one, or many ids in it.

## Atomicity

Treat each call to `update(world, queryResult)` as a single, focused update for the tick's batch of matched entities. Systems should perform short, deterministic operations and avoid long-running or blocking work inside `update`.

`queryResult.entities` and `queryResult.components` are snapshots computed before `update` is called, so it's safe to mutate world state (adding/removing components or entities) while iterating them - the arrays you're looping over won't change out from under you. Mutations still take effect immediately and may be visible to subsequent systems this same tick or on later iterations. Because of this, do not rely on implicit ordering between systems for coordination; prefer explicit events or deferred work when systems need to coordinate complex state changes.

## Releasing resources: cleanup

Systems may implement an optional `cleanup(world)` method. It runs once - not per entity - both when the system is removed via `EcsWorld.removeSystem` and when the owning world is stopped via `EcsWorld.stop` (most commonly because a [`Game`](./game.md) was stopped). It's the place to release resources the system itself acquired, resources that a component's own lifecycle doesn't already handle.

Since `cleanup` doesn't receive a query result, a system that needs to release a resource per matched entity should track what it acquired itself (for example in a `Map` keyed by entity id) rather than re-querying the world:

```ts
const audioSystem: EcsSystem<[AudioComponent]> = {
  query: [Audio],
  update(world, { components: [audioComponents] }) {
    for (const audio of audioComponents) {
      if (audio.playSound) {
        audio.sound.play();
        audio.playSound = false;
      }
    }
  },
  cleanup(world) {
    const { components: [audioComponents] } = world.query<[AudioComponent]>([Audio]);

    for (const audio of audioComponents) {
      if (audio.sound.playing()) {
        audio.sound.stop();
        audio.sound.unload();
      }
    }
  },
};
```

Other systems use `cleanup` to remove physics bodies/joints from the physics world (tracking a `Map<entity, RigidBody>` of what they registered, so `cleanup` only has to iterate that map), or to dispose scratch GPU render targets that a system allocates outside of any component (see the gaussian blur system for an example of the latter). If a system doesn't acquire any resources beyond its components, leave `cleanup` off.
