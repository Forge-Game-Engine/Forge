---
sidebar_position: 1.5
---

# Collisions

Every tick, three systems find the colliders that overlap and push them
apart:

- [`createBroadPhaseEcsSystem`](/Forge/docs/api/functions/createBroadPhaseEcsSystem)
  writes each collider's world-space bounds to its `aabb` field and lists
  the pairs of colliders whose bounds overlap, except pairs of two static
  colliders.
- [`createNarrowPhaseEcsSystem`](/Forge/docs/api/functions/createNarrowPhaseEcsSystem)
  tests each of those pairs' shapes. It writes every collision between two
  solid colliders to `collisionManifolds`, and every overlap to the
  entities' contacts.
- [`createCollisionResolutionEcsSystem`](/Forge/docs/api/functions/createCollisionResolutionEcsSystem)
  changes the colliding bodies' velocities so they separate, with friction
  and restitution.

[Registering the physics systems](./index.md#registering-the-physics-systems)
shows their order.

## Finding colliding pairs

The broad phase keeps its colliders and the pairs it found from one tick to
the next, in a [`BroadPhaseEcsComponent`](/Forge/docs/api/interfaces/BroadPhaseEcsComponent)
on an entity of its own. Create that entity once per world, before the
first update, with [`createBroadPhase`](/Forge/docs/api/functions/createBroadPhase):

```ts
import {
  type CollisionPair,
  createBroadPhase,
  createBroadPhaseEcsSystem,
} from '@forge-game-engine/forge/physics';

const collisionPairs: CollisionPair[] = [];

createBroadPhase(world);
world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
```

The broad phase system throws when the world has no broad phase. It is the
only system that writes the broad phase and each collider's `aabb`.

Every collider is in one of two
[dynamic AABB trees](./dynamic-aabb-tree.md): static colliders (no
`RigidBodyEcsComponent`, or a `'static'` one) in one, kinematic and dynamic
colliders in the other. Each tick, the broad phase:

1. recomputes the `aabb` of each collider whose world position, rotation,
   shape or `ColliderEcsComponent` changed, and moves it in its tree. The
   `aabb` of a collider that didn't change isn't recomputed. It is empty,
   and overlaps nothing, until the broad phase first runs after the
   collider is added.
2. looks for new pairs only around the colliders whose box in the tree
   changed, or whose `category` or `mask` changed. A pair is kept until
   the two colliders' boxes in the tree stop overlapping.
3. writes the pairs whose `aabb`s overlap to `collisionPairs`, sorted by
   entity, with `entityA` the lower entity.

Its cost grows with the number of colliders that move, not with the total
number of colliders.

Two static colliders are never paired, so they never collide and never
appear in each other's contacts, even when game code moves one of them. A
collider that game code moves and that has to collide with colliders that
have no rigid body needs a `'kinematic'` rigid body (see
[Body types](./rigid-bodies.md#body-types)).

A collider's shape doesn't change in place. To change it, assign a new
`Collider` to `ColliderEcsComponent.collider`, and the broad phase
recomputes its `aabb` on its next run.

## Filtering which colliders collide

A collider's `category` is the set of bits it belongs to, and its `mask` is
the set of categories it collides with. Two colliders are tested against
each other only when each one's `category` shares a bit with the other's
`mask`. By default `category` is `1` and `mask` is
[`allCollisionCategories`](/Forge/docs/api/variables/allCollisionCategories),
so every collider collides with every other.

```ts
import {
  addColliderComponent,
  allCollisionCategories,
} from '@forge-game-engine/forge/physics';

const STATIC_GEOMETRY = 1 << 0;
const PROJECTILES = 1 << 1;

// Projectiles collide with every category except other projectiles.
addColliderComponent(world, projectile, {
  collider: projectileCollider,
  category: PROJECTILES,
  mask: allCollisionCategories & ~PROJECTILES,
});

addColliderComponent(world, wall, {
  collider: wallCollider,
  category: STATIC_GEOMETRY,
});
```

The broad phase skips a pair the categories and masks exclude, so the pair
is never resolved and never appears in either entity's contacts.

## Friction and restitution

A collider's `friction` sets how much it resists sliding along another
collider, and its `restitution` sets how much it bounces off one (`0` for no
bounce). Collision resolution combines the two colliders' values with their
geometric mean.

```ts
import {
  addColliderComponent,
  CircleCollider,
} from '@forge-game-engine/forge/physics';

addColliderComponent(world, ball, {
  collider: new CircleCollider(16),
  friction: 0.4,
  restitution: 0.8,
});
```

## Sensors

A sensor collider is detected but never resolved: nothing bounces off it or
is pushed by it, and it never appears in `collisionManifolds`. Its overlaps
are reported only through contacts. Use a sensor for a trigger zone, a
pickup, or any area a body passes through while game code reacts to it.

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import {
  addColliderComponent,
  addContactsComponent,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';

const zone = world.createEntity();

addPositionComponent(world, zone, { local: { x: 0, y: 200 } });
addColliderComponent(world, zone, {
  collider: new PolygonCollider([
    { x: -200, y: -40 },
    { x: 200, y: -40 },
    { x: 200, y: 40 },
    { x: -200, y: 40 },
  ]),
  sensor: true,
});
addContactsComponent(world, zone);
```

A sensor without a `RigidBodyEcsComponent` is static, so it detects only
kinematic and dynamic bodies. A sensor on a moving body moves with it.

:::note
A sensor overlap is detected only when at least one of the two entities has
a `ContactsEcsComponent`: on the sensor to list what is inside it, or on
the other body to list the sensors it is in. Two overlapping sensors are
reported to each other, unless both are static or their categories and
masks exclude each other.
:::

## Reading contacts

Add a [`ContactsEcsComponent`](/Forge/docs/api/interfaces/ContactsEcsComponent)
with `addContactsComponent`, and `createNarrowPhaseEcsSystem` writes three
lists to it every tick:

- `touching`: every entity the collider overlaps this tick, each listed
  once.
- `started`: the entities in `touching` that weren't in it last tick.
- `ended`: the entities that were in `touching` last tick and aren't now,
  because they moved apart, lost their collider or were removed.

Only entities with a `ContactsEcsComponent` have their contacts recorded.
When two entities touch, add it to the one whose system reacts. A system
reads the lists like any other component:

```ts
import { type EcsSystem, formatEntity } from '@forge-game-engine/forge/ecs';
import {
  type ContactsEcsComponent,
  contactsId,
} from '@forge-game-engine/forge/physics';

const contactLogSystem: EcsSystem<[ContactsEcsComponent]> = {
  query: [contactsId],
  update: (world, { entities, components: [contacts] }) => {
    for (let i = 0; i < entities.length; i++) {
      for (const other of contacts[i].started) {
        if (!world.isAlive(other)) {
          continue;
        }

        console.log(
          `${formatEntity(entities[i])} touched ${formatEntity(other)}`,
        );
      }
    }
  },
};

world.addSystem(contactLogSystem);
```

Register a system that reads contacts after `createNarrowPhaseEcsSystem`;
one registered before it reads the previous tick's lists. The narrow phase
replaces the lists every tick, and is the only system that writes them.

:::caution
A contact can name an entity that has been removed. Another system can
remove an entity in `touching` or `started` later in the same tick, and
`ended` lists entities removed since the last tick. Check
`world.isAlive(other)` before reading the other entity's components.
:::

## Reading collision manifolds

`collisionManifolds`, the array passed to `createNarrowPhaseEcsSystem`,
holds a [`CollisionManifold`](/Forge/docs/api/interfaces/CollisionManifold)
for every collision between two solid colliders this tick: the two
entities, the contact `normal`, the penetration `depth` and the
`contactPoints`. Collision resolution reads it. Read it in a system
registered after the narrow phase when game code needs a collision's
geometry, such as the point of an impact.

A pair of entities can have several manifolds (a body touching several of a
terrain's surface edges has one per edge), and manifolds don't include
sensor overlaps. To find which entities a collider touches, read its
contacts.

Each manifold also records `colliderA` and `colliderB`, the collider shapes
it was computed from. A sleeping body's contacts are written from the
manifolds it fell asleep with, without testing them again, while both
entities still have those colliders (see
[Collision detection for sleeping bodies](./sleeping.md#collision-detection-for-sleeping-bodies)).

## Removing a collider

Removing a collider's entity removes it from collision detection, and so
does removing a static body's `ColliderEcsComponent` (a dynamic body needs
its collider, see
[Mass and center of mass](./rigid-bodies.md#mass-and-center-of-mass)). On
the next tick, the entity is listed in `ended` of every entity whose
contacts listed it in `touching`.
