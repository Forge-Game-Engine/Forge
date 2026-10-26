---
sidebar_position: 1.5
---

# Collisions

Every fixed step, three systems find the colliders that overlap and push them
apart:

- [`createBroadPhaseEcsSystem`](/Forge/docs/api/functions/createBroadPhaseEcsSystem)
  writes each collider's world-space bounds to its `aabb` field and lists
  the pairs of colliders whose bounds overlap, except pairs of two static
  colliders. It needs the world's broad phase, created once per world with
  `createBroadPhase(world)`; see [Broad Phase](./broad-phase.md).
- [`createNarrowPhaseEcsSystem`](/Forge/docs/api/functions/createNarrowPhaseEcsSystem)
  tests each of those pairs' shapes. It writes every collision between two
  solid colliders to `collisionManifolds`, and every overlap to the
  entities' contacts.
- [`createCollisionResolutionEcsSystem`](/Forge/docs/api/functions/createCollisionResolutionEcsSystem)
  changes the colliding bodies' velocities so they separate, with friction
  and restitution.

[Registering the physics systems](./index.md#registering-the-physics-systems)
shows their order.

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
kinematic and dynamic bodies. A sensor on a moving body moves with it. A
sensor detects a [sleeping body](./sleeping.md) inside it, and an overlap
with a sensor never wakes a sleeping body.

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
lists to it every step:

- `touching`: every entity the collider overlaps this step, each listed
  once.
- `started`: the entities in `touching` that weren't in it the previous
  step.
- `ended`: the entities that were in `touching` the previous step and
  aren't now, because they moved apart, lost their collider or were
  removed.

While a body sleeps, its contacts keep the entities it touched when it fell
asleep in `touching`, with nothing in `started` or `ended` (see
[Collision detection for sleeping bodies](./sleeping.md#collision-detection-for-sleeping-bodies)).
A new contact with a solid collider is listed in `started` and wakes the
body.

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

world.addSystem(contactLogSystem, { group: fixedUpdate });
```

Register a system that reads `started` or `ended` in the fixed-update group
(see [Registering the physics systems](./index.md#registering-the-physics-systems)),
after `createNarrowPhaseEcsSystem`; one registered before it reads the
previous step's lists. The narrow phase replaces the lists every step, and
is the only system that writes them.

:::caution
A frame can run several fixed steps or none. A system in the default group
runs once per frame, so it doesn't read the `started` and `ended` of a
frame's earlier steps, and on a frame with no step it reads the same
`started` and `ended` as on the previous frame. `touching` is the state
after the latest step, and a system in any group can read it.
:::

:::caution
A contact can name an entity that has been removed. Another system can
remove an entity in `touching` or `started` later in the same step, and
`ended` lists entities removed since the previous step. Check
`world.isAlive(other)` before reading the other entity's components.
:::

## Reading collision manifolds

`collisionManifolds`, the array passed to `createNarrowPhaseEcsSystem`,
holds a [`CollisionManifold`](/Forge/docs/api/interfaces/CollisionManifold)
for every collision between two solid colliders this step: the two
entities, the contact `normal`, the penetration `depth` and the
`contactPoints`. Collision resolution reads it. Read it in a system
registered in the fixed-update group after the narrow phase when game code
needs a collision's geometry, such as the point of an impact.

A pair of entities can have several manifolds (a body touching several of a
terrain's surface edges has one per edge), and manifolds don't include
sensor overlaps. To find which entities a collider touches, read its
contacts.

Each manifold also records `colliderA` and `colliderB`, the collider shapes
it was computed from. A sleeping body's contacts are written from the
manifolds it fell asleep with, without testing them again, until either
entity moves or gets a different collider (see
[Collision detection for sleeping bodies](./sleeping.md#collision-detection-for-sleeping-bodies)).

## Removing a collider

Removing a collider's entity removes it from collision detection, and so
does removing a static body's `ColliderEcsComponent` (a dynamic body needs
its collider, see
[Mass and center of mass](./rigid-bodies.md#mass-and-center-of-mass)). On
the next step, the entity is listed in `ended` of every entity whose
contacts listed it in `touching`.
