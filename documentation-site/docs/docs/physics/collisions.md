---
sidebar_position: 1.5
---

# Collisions

The broad and narrow phase systems find which colliders overlap every
tick. This page covers the three things you control about that: which
colliders are tested against each other (filtering), which ones are
detected but never pushed (sensors), and how a system finds out what an
entity touched (contacts).

Try it in the [Sensors demo](/Forge/demos/sensors), where falling bodies
light up while they pass through trigger zones that never block them.

## Collision filtering

By default every collider is tested against every other. Give colliders a
`category` and a `mask` to say which pairs matter: two colliders are tested
only when each one's `category` shares a bit with the other's `mask`. A pair
either mask excludes never reaches the narrow phase, so filtering also saves
the work of testing pairs your game would ignore anyway.

```ts
import {
  addColliderComponent,
  allCollisionCategories,
} from '@forge-game-engine/forge/physics';

const PLAYER = 1 << 0;
const ENEMY = 1 << 1;
const PLAYER_BULLET = 1 << 2;
const WALL = 1 << 3;

// Player bullets hit enemies and walls, never the player or each other.
addColliderComponent(world, bullet, {
  collider: bulletCollider,
  category: PLAYER_BULLET,
  mask: ENEMY | WALL,
});

// Enemies collide with everything except other enemies.
addColliderComponent(world, enemy, {
  collider: enemyCollider,
  category: ENEMY,
  mask: allCollisionCategories & ~ENEMY,
});
```

`category` defaults to `1` and `mask` to `allCollisionCategories` (every
bit), so colliders that set neither collide with everything. Categories are
32 bits, as JavaScript's bitwise operators allow; test a bit with
`(value & bit) !== 0`, not `> 0`, since `1 << 31` is negative. The test is
symmetric: either collider can rule a pair out, and both have to accept it.

Filtering applies to resolution, sensors and contacts alike: a pair the
masks exclude is never resolved and never shows up in either entity's
contacts. `raycast` takes its own `mask` (see
[Raycasting](./raycasting.md)).

## Contacts

Give an entity a `ContactsEcsComponent` and `createNarrowPhaseEcsSystem`
fills it every tick:

- `touching`: every entity it overlaps this tick, each listed once.
- `started`: the entities in `touching` that weren't there last tick.
- `ended`: the entities that were touching it last tick and aren't now,
  because they moved apart, lost their collider or were removed.

Contacts are opt-in, so only add the component to entities whose systems
ask what they touch (the player, a projectile, a pickup), not to walls and
debris. A system reads them like any other component:

```ts
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  ContactsEcsComponent,
  contactsId,
} from '@forge-game-engine/forge/physics';

export const createPickupEcsSystem = (): EcsSystem<
  [PickupEcsComponent, ContactsEcsComponent]
> => ({
  query: [pickupId, contactsId],
  update: (world, { entities, components: [pickups, contacts] }) => {
    for (let i = 0; i < entities.length; i++) {
      for (const other of contacts[i].started) {
        if (!world.isAlive(other)) {
          continue;
        }

        const wallet = world.getComponent(other, walletId);

        if (wallet) {
          wallet.coins += pickups[i].value;
          world.removeEntity(entities[i]);
          break;
        }
      }
    }
  },
});
```

Register systems that read contacts after `createNarrowPhaseEcsSystem`, or
they see the previous tick's. The narrow phase owns every field of the
component and replaces the lists each tick, so never write to them.

Contacts are only recorded on entities that have a `ContactsEcsComponent`.
A bullet and an asteroid don't both need one: add it to the side whose
system reacts.

### Removed entities

A contact can name an entity that no longer exists:

- `touching` is computed before your systems run, so another system may
  already have removed one of its entities this tick (two asteroids hit by
  the same bullet both list it). Check `world.isAlive(other)` before
  acting on one.
- `ended` lists entities that were removed since the last tick, so a
  "stopped touching" handler that reads the other entity's components
  should check `isAlive` too.

### Contacts vs. collision manifolds

`collisionManifolds`, the array you pass to `createNarrowPhaseEcsSystem`,
holds the contact points, normal and depth of every solid collision. It's
the input to `createCollisionResolutionEcsSystem`. Read it only when you
need that geometry (for example, the impact point for a spark effect). To
find what an entity touched, read its contacts instead of scanning the
manifolds: a pair can produce several manifolds (one per terrain edge it
touches), manifolds never include sensor overlaps, and scanning them costs
one pass over every collision per entity.

## Sensors

A sensor collider is detected and reported through contacts, but never
resolved: nothing bounces off it or is pushed by it, and it never appears
in `collisionManifolds`. Use one for trigger zones, pickups, and anything
else a body should pass through while your game reacts.

```ts
import {
  addColliderComponent,
  addContactsComponent,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';

const zone = world.createEntity();

addPositionComponent(world, zone, { local: { x: 0, y: -200 } });
addColliderComponent(world, zone, {
  collider: new PolygonCollider(rectangleVertices(400, 80)),
  sensor: true,
});
addContactsComponent(world, zone);
```

A sensor works with or without a `RigidBodyEcsComponent`. Like any static
collider, a trigger zone that doesn't move needs none; a sensor attached to
a moving body (a pickup radius around the player) moves with it.

Gotchas:

- A sensor overlap is only detected when at least one of the two entities
  has a `ContactsEcsComponent`, since there's nowhere else to report it.
  Put it on the sensor to ask "what's inside this zone?", or on the body
  to ask "which zones am I in?".
- Two sensors that overlap are reported to each other. Give sensors a
  `mask` without their own category if they shouldn't see each other.
- `raycast` passes through sensors unless you pass
  `includeSensors: true`, so a line-of-sight ray isn't stopped by a trigger
  zone.

## Bounds

The broad phase writes each collider's world-space bounds to its `aabb`
field every tick, from its world position and rotation. It's output only:
read it, but don't write it. A collider added since the broad phase last
ran has empty bounds, which overlap nothing, until the next tick.
