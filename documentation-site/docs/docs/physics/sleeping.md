---
sidebar_position: 8
---

# Sleeping Bodies

A dynamic body that has moved slower than a small speed for long enough is
put to sleep: gravity, collision resolution, joints, springs, dampers,
angular velocity motors, integration and continuous collision detection
skip it until something disturbs it.
[`createSleepEcsSystem`](/Forge/docs/api/functions/createSleepEcsSystem)
puts bodies to sleep and wakes them, and it is the only system that writes
a body's `isSleeping`.

The [Sleeping Bodies demo](/Forge/demos/sleeping) dims each body while
it's asleep. A pyramid of boxes and a chain of jointed planks fall asleep
once they settle, and wake when you click near them or open the trapdoor
under the pyramid. A readout shows how many pairs the narrow phase still
tests.

## Islands

Bodies fall asleep and wake in **islands**. An island is a group of dynamic
bodies connected through this step's collisions and through revolute
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

Register the sleep system in the fixed-update group, after
`createNarrowPhaseEcsSystem` and before every system that changes velocity,
and pass it the narrow phase's `collisionManifolds`:

```ts
import {
  createTransformEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import {
  createBroadPhase,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
  createSleepEcsSystem,
} from '@forge-game-engine/forge/physics';

createBroadPhase(world);
const physics = { group: registerFixedUpdate(world, time) };

world.addSystem(createTransformEcsSystem(time), physics);
world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
world.addSystem(
  createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  physics,
);
world.addSystem(createSleepEcsSystem(collisionManifolds, time), physics);
world.addSystem(createGravityEcsSystem(time), physics);
world.addSystem(
  createCollisionResolutionEcsSystem(
    collisionManifolds,
    contactConstraints,
    time,
  ),
  physics,
);
world.addSystem(createEulerIntegrationEcsSystem(time), physics);
```

The sleep system reads this step's collisions, so a body that collides with
a sleeping island wakes it before collision resolution runs in this step.
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
  physics,
);
```

[`SleepOptions`](/Forge/docs/api/interfaces/SleepOptions) lists the
options. While a game is paused (`time.timeScale` is `0`), no fixed steps
run, so the sleep system doesn't run: no island falls asleep or wakes
until the game resumes.

## Waking a body

When a body falls asleep, the sleep system records in its `sleepRecord` its
pose, contacts, collider and gravity, and the pose and collider of each
static body, kinematic body and collider-only entity it touches or is
jointed to. It compares a sleeping body with that record and wakes its
island when any body in the island:

- has a non-zero `velocity` or `angularVelocity`, written by game code,
  [`applyImpulse`](/Forge/docs/api/functions/applyImpulse),
  `applyTorque` or `applyExplosiveForce`;
- has an angular velocity motor whose `targetVelocity` is set to something
  other than `0`;
- has a `position.local` or `rotation.local` that changed (a teleport);
- has a `ColliderEcsComponent` whose `collider` is a different object (a
  new shape);
- has a `GravityEcsComponent` whose `amount` changed, or gains or loses
  its `GravityEcsComponent`;
- touches a body it didn't touch when it fell asleep, or stops touching
  one, for example because that body was removed;
- gains or loses a joint, spring or damper;
- touches or is jointed to an awake dynamic body, or to a kinematic body
  with a non-zero velocity;
- touches or is jointed to a static body, kinematic body or collider-only
  entity that was removed, lost its `ColliderEcsComponent`, has a
  different `collider` object, or has a different `position.world` or
  `rotation.world`, for example a floor or a lift that game code moved by
  writing its `position.local`;
- has `canSleep` set to `false` or `wakeRequested` set to `true`.

A sensor never wakes a sleeping body: an overlap with a sensor produces no
collision manifold, so the sleep system doesn't count it as a contact. The
narrow phase tests a sensor pair on every step, so a sensor's contacts list
a sleeping body inside it in `touching`.

A woken island's `restTime` values are set back to `0`, so it stays awake
for at least `restDuration`.

A system that writes a sleeping body's velocity or pose runs in the default
group, or in the fixed-update group before its `createTransformEcsSystem`,
so the island wakes in the next step, before collision resolution. Velocity
written later in a step moves the body in integration, and the island
wakes in the step after.

### Waking a body after a settings change

Some changes aren't in a sleeping body's record: changing a joint's
limits, moving a joint's other end from one static body, kinematic body or
collider-only entity to another, a spring's `stiffness` or `restLength`,
or a collider's `friction` or `restitution`. To wake a body after one of them, set its
`wakeRequested` to `true`:

```ts
spring.stiffness = 200;
rigidBody.wakeRequested = true;
```

On its next run, the sleep system wakes the body's island, sets each
body's `restTime` to `0` and sets `wakeRequested` back to `false`. On an
awake body, `wakeRequested` keeps its island awake for another
`restDuration`. On a kinematic or static body, it wakes the islands that
touch or are jointed to it.

## Collision detection for sleeping bodies

The narrow phase doesn't test a pair again when neither entity is awake
and at least one of them is a sleeping body: two sleeping boxes, or a
sleeping box on a static floor. When a body falls asleep, the sleep system
records the collision manifolds it's part of in its `sleepRecord`. Neither
entity has moved since, so the narrow phase writes those manifolds into
`collisionManifolds` instead of testing the pair. A settled pile costs no
collision tests:

- each body's [contacts](./collisions.md#reading-contacts) keep the
  entities it rests on in `touching`, with nothing in `started` or
  `ended`;
- the sleep system reads the island's manifolds in `collisionManifolds`,
  so the island stays asleep;
- collision resolution keeps each contact's impulses, and starts from them
  when the island wakes, so a woken stack doesn't sag.

The narrow phase tests the pair as usual when either entity is awake (an
awake body hitting the pile is how the pile wakes), when the sleeping
body's record has no manifolds for the pair, and when either collider is a
sensor. When the broad phase stops listing the pair, because their bounds
no longer overlap or one of them was removed or lost its collider, the
contact ends and the sleeping body wakes.

A sleeping body counts as awake as soon as anything in
[Waking a body](#waking-a-body) changed, so the narrow phase tests its
pairs again on the same tick. Replacing a collider's shape (as a tilemap
layer's collider system does when its tiles change), or moving a static
body, a collider-only entity or a still kinematic body that a sleeping
body touches, tests their contact against the new shape or pose before
collision resolution runs on that tick.

[`findSleepingManifolds`](/Forge/docs/api/functions/findSleepingManifolds)
returns the recorded manifolds the narrow phase reuses for a pair, or
`null` when it tests the pair. It answers for the world as it is when you
call it, so it tells you what the narrow phase would do with the pair on
its next step, not what it did on the latest one. Use it for profiling or
a debug readout, such as counting how many of the broad phase's pairs a
settled scene still tests:

```ts
import { findSleepingManifolds } from '@forge-game-engine/forge/physics';

const testedPairs = collisionPairs.filter(
  ({ entityA, entityB }) =>
    findSleepingManifolds(world, entityA, entityB) === null,
).length;
```

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
pushed against a wall: a motor is a torque applied every step, so a body it
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
body wakes on the first step. `addRigidBodyComponent` throws for
`isSleeping: true` on a kinematic or static body, or with
`canSleep: false`.

## Checking whether a body is asleep

`rigidBody.isSleeping` is `true` while the body is asleep.
[`isBodyAwake`](/Forge/docs/api/functions/isBodyAwake) returns whether a
body takes part in this step's simulation: `true` for a dynamic body that
isn't sleeping or was disturbed since it fell asleep, and for a kinematic
body with a non-zero velocity; `false` otherwise. A sleeping body that
gained or lost a joint, spring or damper, or whose motor's
`targetVelocity` was set, still counts as asleep until the sleep system
wakes it on its next run, since only the sleep system checks for those.

```ts
import { isBodyAwake } from '@forge-game-engine/forge/physics';

if (isBodyAwake(world, crate)) {
  // The crate moves this step.
}
```
