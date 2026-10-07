---
sidebar_position: 2
---

# Applying Forces

A force changes a dynamic body's `velocity` or `angularVelocity`. Kinematic
and static bodies are never affected by forces (see
[Body types](./rigid-bodies.md#body-types)). The physics module has these
kinds of force:

- **Gravity**: a constant acceleration applied every tick, by a
  [`GravityEcsComponent`](/Forge/docs/api/type-aliases/GravityEcsComponent).
- **Impulses**: an instant change of velocity, by
  [`applyImpulse`](/Forge/docs/api/functions/applyImpulse).
- **Torque**: a change of angular velocity, by
  [`applyTorque`](/Forge/docs/api/functions/applyTorque).
- **Angular velocity motors**: torque that turns a body towards a target
  angular velocity every tick, by an
  [`AngularVelocityMotorEcsComponent`](/Forge/docs/api/interfaces/AngularVelocityMotorEcsComponent).
- **Springs and dampers**: forces between two bodies' anchor points every
  tick, by a
  [`LinearSpringEcsComponent`](/Forge/docs/api/interfaces/LinearSpringEcsComponent)
  or a
  [`LinearDamperEcsComponent`](/Forge/docs/api/interfaces/LinearDamperEcsComponent).
- **Explosions**: an impulse away from a point, applied to every body near
  it, by [`applyExplosiveForce`](/Forge/docs/api/functions/applyExplosiveForce).

How far a force moves a body depends on the body's mass and moment of
inertia, which come from its collider (see
[Mass and center of mass](./rigid-bodies.md#mass-and-center-of-mass)).

## Gravity

Add a `GravityEcsComponent` to a body with `addGravityComponent`, and
register [`createGravityEcsSystem`](/Forge/docs/api/functions/createGravityEcsSystem).
Every tick, the system adds `amount` times the tick's duration to the
body's velocity:

```ts
import {
  addGravityComponent,
  createGravityEcsSystem,
} from '@forge-game-engine/forge/physics';

const gravity = addGravityComponent(world, body, {
  amount: { x: 0, y: -600 },
});

world.addSystem(createGravityEcsSystem(time));
```

Gravity is per entity, so each body can have a different `amount`, or none.
`amount` can be changed at any time, for example to reverse gravity:

```ts
gravity.amount.y = 600;
```

Register `createGravityEcsSystem` before `createCollisionResolutionEcsSystem`,
so collision resolution works with the velocity gravity changed this tick.

## Impulses

`applyImpulse(world, entity, impulse, worldPoint)` applies `impulse` at a
world-space point. It changes the body's velocity by `impulse / mass`. An
impulse applied anywhere other than the body's center of mass also changes
its angular velocity.

```ts
import { positionId } from '@forge-game-engine/forge/common';
import { applyImpulse } from '@forge-game-engine/forge/physics';

const position = world.getComponent(body, positionId);

if (position !== null) {
  // For a collider centered on the entity's origin, the position is the
  // center of mass, so the body doesn't start to turn.
  applyImpulse(world, body, { x: 0, y: 500 }, position.world);
}
```

An impulse is a single change, for something that happens once, such as a
jump or a hit. For a push that lasts over time, such as wind or thrust,
apply the force times the tick's duration every tick:

```ts
import { Vec2 } from '@forge-game-engine/forge/math';

applyImpulse(
  world,
  body,
  Vec2.multiply(Vec2.clone(force), time.deltaTimeInSeconds),
  position.world,
);
```

:::caution
An impulse applied every tick without being multiplied by the tick's
duration pushes a body further at a higher frame rate.
:::

## Torque

`applyTorque(world, entity, torque, deltaTimeInSeconds)` changes a body's
angular velocity by `torque / momentOfInertia * deltaTimeInSeconds`. A
positive torque turns the body counter-clockwise. Call it every tick for a
continuous torque:

```ts
import { applyTorque } from '@forge-game-engine/forge/physics';

applyTorque(world, body, 50, time.deltaTimeInSeconds);
```

Call it from a system registered before `createEulerIntegrationEcsSystem`,
so the change moves the body in the same tick.

A body keeps its angular velocity when nothing turns it. A
`RigidBodyEcsComponent`'s `angularDrag` (`0` by default) reduces
`angularVelocity` towards `0` every tick, in proportion to its value:

```ts
addRigidBodyComponent(world, wheel, { angularDrag: 1.5 });
```

## Angular velocity motors

An `AngularVelocityMotorEcsComponent` turns a body towards a
`targetVelocity`, in radians per second, with a torque of at most
`maxTorque`. Add one with `addAngularVelocityMotorComponent`, and register
[`createAngularVelocityMotorEcsSystem`](/Forge/docs/api/functions/createAngularVelocityMotorEcsSystem):

```ts
import {
  addAngularVelocityMotorComponent,
  createAngularVelocityMotorEcsSystem,
} from '@forge-game-engine/forge/physics';

const motor = addAngularVelocityMotorComponent(world, body, {
  targetVelocity: 8,
  maxTorque: 40,
});

world.addSystem(createAngularVelocityMotorEcsSystem(time));
```

The system computes the torque every tick from the body's current angular
velocity, so after a collision or another torque changes it, the motor
turns the body back towards `targetVelocity`. Change `targetVelocity` or
`maxTorque` on the component at any time. Register the system before
`createEulerIntegrationEcsSystem`.

## Springs and dampers

A `LinearSpringEcsComponent` pushes or pulls two bodies' anchor points
towards `restLength` apart, with a force of `stiffness` times the
difference. A `LinearDamperEcsComponent` resists the anchor points moving
towards or away from each other, with a force of `dampingCoefficient`
times that speed. A spring on its own keeps oscillating, so it is usually
paired with a damper between the same anchor points, for example in a
vehicle's suspension.

Add them to an entity of their own, which references the two bodies as
`entityA` and `entityB`, and register
[`createLinearSpringEcsSystem`](/Forge/docs/api/functions/createLinearSpringEcsSystem)
and
[`createLinearDamperEcsSystem`](/Forge/docs/api/functions/createLinearDamperEcsSystem):

```ts
import {
  addLinearDamperComponent,
  addLinearSpringComponent,
  createLinearDamperEcsSystem,
  createLinearSpringEcsSystem,
} from '@forge-game-engine/forge/physics';

const connection = world.createEntity();

addLinearSpringComponent(world, connection, {
  entityA: bodyA,
  entityB: bodyB,
  restLength: 40,
  stiffness: 800,
});
addLinearDamperComponent(world, connection, {
  entityA: bodyA,
  entityB: bodyB,
  dampingCoefficient: 40,
});

world.addSystem(createLinearSpringEcsSystem(time));
world.addSystem(createLinearDamperEcsSystem(time));
```

The anchor points `localAnchorA` and `localAnchorB` are in each body's
local space, and default to the bodies' origins. A spring without a
`restLength` uses the distance between its anchor points when it is added.
An entity in `entityA` or `entityB` without a `RigidBodyEcsComponent` is
static.

Register both systems before `createCollisionResolutionEcsSystem`, as for
gravity.

## Explosions

`applyExplosiveForce(world, center, force, radius)` applies an impulse
away from `center` to every dynamic body whose center of mass is within
`radius` of it. The impulse is `force` at `center` and falls off linearly
to `0` at `radius`. It is applied at each body's center of mass, so it
doesn't turn the body.

```ts
import { applyExplosiveForce } from '@forge-game-engine/forge/physics';

applyExplosiveForce(world, { x: 0, y: 0 }, 1_000_000, 600);
```

`center` is in world space. To place an explosion at a point on the
screen, convert the point with the camera's view (see
[World Units and Cameras](../rendering/world-units-and-cameras.md)).

`applyExplosiveForce` measures the distance to every entity with a
`RigidBodyEcsComponent` and a `PositionEcsComponent`, whatever the
`radius`.

## Removing a force

Remove a `GravityEcsComponent` or `AngularVelocityMotorEcsComponent` from
its body, and a `LinearSpringEcsComponent` or `LinearDamperEcsComponent`
from its entity, with `world.removeComponent`. A body keeps the velocity a
force gave it.
