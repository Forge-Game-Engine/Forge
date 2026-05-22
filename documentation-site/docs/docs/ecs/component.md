---
sidebar_position: 4
---

# Components

A component is a plain data container (no logic) used to store state for
entities. Components are stored by `EcsWorld` and associated with entity ids,
components are not attached to entity objects.

There are two kinds of components:

- Standard components: typed objects that hold data.
- Tags: boolean markers with no payload, used to distinguish entities.

## Standard components

Standard components should be small and represent a single concept of state.
Define a TypeScript interface for the shape of the component, then create a
component id (key) that you use with the world APIs.

Example:

```ts
import { createComponentId, type Color } from '@forge-game-engine/forge/ecs';

interface FireComponent {
  temperature: number;
  color: Color;
}

const Fire = createComponentId<FireComponent>('fire');
```

Add and read components via the world API:

```ts
world.addComponent(entity, Fire, { temperature: 100, color: Color.Red });

const fire = world.getComponent(entity, Fire);

if (fire) {
  fire.temperature += 10; // components are plain mutable data
}
```

Keep components focused: prefer several small components over one large,
monolithic component.

## Tags

Tags are marker components with no payload. Use them when you need to
differentiate entities without adding data.

```ts
import { createTagId } from '@forge-game-engine/forge/ecs';

const ai = createTagId('ai');
world.addTag(enemyEntity, ai);
```

Tags are commonly used in queries to select entities that should be processed
by a particular system (for example, `AI` vs `player` entities).
