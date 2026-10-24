---
sidebar_position: 8
---

# Sleeping Bodies

A dynamic body that has moved slower than a small speed for long enough is
put to sleep: gravity, collision resolution, joints, springs, dampers,
angular velocity motors and integration skip it until something disturbs
it.
[`createSleepEcsSystem`](/Forge/docs/api/functions/createSleepEcsSystem)
puts bodies to sleep and wakes them, and it is the only system that writes
a body's `isSleeping`.

## Islands

Bodies fall asleep and wake in **islands**. An island is a group of dynamic
bodies connected through this tick's collisions and through revolute
joints, prismatic joints, linear springs and linear dampers. An island
falls asleep when every body in it has rested for long enough, and when any
body in it is disturbed, every body in it wakes.

Static bodies, kinematic bodies and collider-only entities don't join
islands. Two boxes resting on the same floor are two islands, so moving one
box doesn't wake the other.

Only dynamic bodies sleep. A kinematic or static body never has
`isSleeping` set, and the sleep system sets `isSleeping` back to `false` on
a sleeping body whose `type` changes.

## Registering the sleep system

Register the sleep system after `createNarrowPhaseEcsSystem` and before
every system that changes velocity, and pass it the narrow phase's
`collisionManifolds`:

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
  createSleepEcsSystem,
} from '@forge-game-engine/forge/physics';

world.addSystem(createTransformEcsSystem());
world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
world.addSystem(createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds));
world.addSystem(createSleepEcsSystem(collisionManifolds, time));
world.addSystem(createGravityEcsSystem(time));
world.addSystem(
  createCollisionResolutionEcsSystem(
    collisionManifolds,
    contactConstraints,
    time,
  ),
);
world.addSystem(createEulerIntegrationEcsSystem(time));
```

The sleep system reads this tick's collisions, so a body that collides with
a sleeping island wakes it before collision resolution runs on this tick.
[Registering the physics systems](./index.md#registering-the-physics-systems)
gives the order of every physics system.

Without the sleep system, no body falls asleep.

## Resting speeds and duration

A body is **resting** while its `velocity` is no faster than
`maxRestingSpeed`, its `angularVelocity` is no faster than
`maxRestingAngularSpeed`, its `canSleep` is `true`, and no angular velocity
motor is turning it towards a non-zero `targetVelocity`. Its `restTime`
counts the seconds it has been resting, and is set back to `0` when it
moves faster. When every body of an island has a `restTime` of at least
`restDuration`, the sleep system sets each body's `velocity` and
`angularVelocity` to `0` and its `isSleeping` to `true`.

The defaults are `0.01` world units per second, 2 degrees per second and
half a second. `maxRestingSpeed` is in world units, so a game whose bodies
are much larger than one unit scales it up in proportion:

```ts
import { createSleepEcsSystem } from '@forge-game-engine/forge/physics';

const pixelsPerMeter = 100;

world.addSystem(
  createSleepEcsSystem(collisionManifolds, time, {
    maxRestingSpeed: 0.01 * pixelsPerMeter,
  }),
);
```

[`SleepOptions`](/Forge/docs/api/interfaces/SleepOptions) lists the
options. While the tick's delta time is `0`, for example while the game is
paused, `restTime` doesn't change and no island falls asleep.

## Waking a body

The sleep system compares a sleeping body with the pose and contacts it had
when it fell asleep, and wakes its island when any body in the island:

- has a non-zero `velocity` or `angularVelocity`, written by game code,
  [`applyImpulse`](/Forge/docs/api/functions/applyImpulse),
  `applyTorque` or `applyExplosiveForce`;
- has an angular velocity motor whose `targetVelocity` is set to something
  other than `0`;
- has a `position.local` or `rotation.local` that changed (a teleport);
- touches a body it didn't touch when it fell asleep, or stops touching
  one, for example because that body was removed;
- gains or loses a joint, spring or damper;
- touches or is jointed to an awake dynamic body, or to a kinematic body
  with a non-zero velocity;
- has `canSleep` set to `false` or `wakeRequested` set to `true`.

A woken island's `restTime` values are set back to `0`, so it stays awake
for at least `restDuration`.

A system that writes a sleeping body's velocity or pose runs before
`createTransformEcsSystem`, so the island wakes on the same tick, before
collision resolution. Velocity written later in the tick moves the body in
integration, and the island wakes on the next tick.

### Waking a body after a settings change

Some changes don't change a sleeping body's velocity, pose or contacts:
changing a `GravityEcsComponent`'s `amount`, a joint's limits, a spring's
`stiffness` or `restLength`, a collider's `friction`, or a collider's
shape when the new shape still touches the same entities. (A motor's
`targetVelocity` isn't one of them: the sleep system wakes a body whose
motor target is set.) To wake a body after one of them, set its
`wakeRequested` to `true`:

```ts
gravity.amount.y = -600;
rigidBody.wakeRequested = true;
```

On its next run, the sleep system wakes the body's island, sets each
body's `restTime` to `0` and sets `wakeRequested` back to `false`. On an
awake body, `wakeRequested` keeps its island awake for another
`restDuration`. On a kinematic or static body, it wakes the islands that
touch or are jointed to it.

:::note
A kinematic body moved by writing its position, rather than its
`velocity`, doesn't wake a sleeping body it already touches while their
bounds still overlap (see
[Collision detection for sleeping bodies](#collision-detection-for-sleeping-bodies)).
Move kinematic bodies by their velocity, or set `wakeRequested` on them
when they move.
:::

## Collision detection for sleeping bodies

The narrow phase doesn't test a pair again when neither entity is awake
and at least one of them is a sleeping body: two sleeping boxes, or a
sleeping box on a static floor. When a body falls asleep, the sleep system
records the collision manifolds it's part of in its `sleepRecord`. Neither
entity has moved since, so the narrow phase writes those manifolds into
`collisionManifolds` instead of testing the pair, the way Box2D keeps a
sleeping island's contacts. A settled pile costs no collision tests, and
its contacts carry on as if they had been tested:

- each body's [contacts](./collisions.md#reading-contacts) keep the
  entities it rests on in `touching`, with nothing in `started` or
  `ended`;
- the sleep system keeps seeing the island's contacts, so the island stays
  asleep;
- collision resolution keeps each contact's impulses, and starts from them
  when the island wakes, so a woken stack doesn't sag.

The narrow phase tests the pair as usual when either entity is awake (an
awake body hitting the pile is how the pile wakes), when the sleeping
body's record has no manifolds for the pair, when either entity's collider
shape object was replaced, and when either collider is a sensor. When the broad phase
stops listing the pair, because their bounds no longer overlap or one of
them was removed or lost its collider, the contact ends and the sleeping
body wakes.

Replacing a collider's shape, as a tilemap layer's collider system does
when its tiles change, tests the pair again, and the body wakes if what it
touches changes. Moving a static body, a collider-only entity or a still
kinematic body by its position doesn't update its contact with a sleeping
body it already touches while their bounds still overlap: set the sleeping
body's `wakeRequested` when moving one of them. A move that makes it touch
a sleeping body it didn't touch before is tested, and wakes the body.

## Keeping a body awake

A body whose `canSleep` is `false` never rests, so its island never falls
asleep:

```ts
import { addRigidBodyComponent } from '@forge-game-engine/forge/physics';

addRigidBodyComponent(world, player, { canSleep: false });
```

Setting `canSleep` to `false` on a sleeping body wakes its island.

An angular velocity motor with a non-zero `targetVelocity` keeps its body
awake too, even while something stops the body turning, like a wheel
pushed against a wall: a motor is a torque applied every tick, so a body it
drives isn't resting. A motor whose `targetVelocity` is `0` (a brake) lets
its body fall asleep, and setting a non-zero target on a sleeping body
wakes its island before collision resolution on the sleep system's next
run. A motor that can't turn its body (one on a fixed-rotation body, or
with a `maxTorque` of `0`) doesn't keep the body awake.

## Creating a body asleep

Pass `isSleeping: true` to `addRigidBodyComponent` to create a dynamic
body asleep, for example a pile of crates placed already resting:

```ts
import { addRigidBodyComponent } from '@forge-game-engine/forge/physics';

addRigidBodyComponent(world, crate, { isSleeping: true });
```

The body stays asleep until it's disturbed. Bodies created asleep that
touch each other form one sleeping island, and one that touches an awake
body wakes on the first tick. `addRigidBodyComponent` throws for
`isSleeping: true` on a kinematic or static body, or with
`canSleep: false`.

## Checking whether a body is asleep

`rigidBody.isSleeping` is `true` while the body is asleep.
[`isBodyAwake`](/Forge/docs/api/functions/isBodyAwake) returns whether a
body takes part in this tick's simulation: `true` for a dynamic body that
isn't sleeping or was disturbed since it fell asleep, and for a kinematic
body with a non-zero velocity; `false` otherwise. A sleeping body that
gained or lost a joint, spring or damper, or whose motor's
`targetVelocity` was set, still counts as asleep until the sleep system
wakes it on its next run, since only the sleep system checks for those.

```ts
import { isBodyAwake } from '@forge-game-engine/forge/physics';

if (isBodyAwake(world, crate)) {
  // The crate moves this tick.
}
```
