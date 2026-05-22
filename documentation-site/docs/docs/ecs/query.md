---
sidebar_position: 6
---

# Query

A system's `query` is an array of component keys. The world finds entities that have all listed components (and any required `tags`) and calls the system's `run` for each matching entity.

Each invocation receives a `QueryResult` with:

- `entity` — the numeric entity id
- `components` — an array of component instances in the same order as the `query`

The world optimises iteration by choosing the smallest internal component set as the "driver" so queries are efficient even with large entity counts.

Example in a system:

```ts
run(result, world) {
	const { entity, components } = result;
	const [pos, vel] = components as [{ x: number; y: number }, { x: number; y: number }];
	// update pos with vel
}
```
