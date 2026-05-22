---
sidebar_position: 5
---

# System

A system is a plain object that declares a `query` (an array of component keys), an optional set of `tags`, and a `run` method. The `run` method is called for each matching entity and receives a `QueryResult` object and the `EcsWorld` instance.

Optional `beforeQuery(world)` can return a value that will be passed to `run` as `beforeQueryResult` for every matching entity (useful for expensive, shared pre-computations).

Registration order can be controlled with `SystemRegistrationOrder` when calling `world.addSystem(system, order)`; use `early`, `normal`, or `late`.

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
