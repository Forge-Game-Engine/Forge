---
sidebar_position: 2
---

# Applying Forces

The engine gives you several ways to make bodies move: a per-entity
`GravityEcsComponent` applied every tick, a free `applyImpulse` function for
instantaneous hits, a free `applyTorque` function for continuous or one-shot
spin, and a free `applyExplosiveForce` function for area-effect blasts.
Picking the right one (and tuning its magnitude relative to body mass) is
the difference between a satisfying jump/explosion and bodies that barely
twitch or fly off the screen.

## Gravity: continuous acceleration

`GravityEcsComponent`, attached via `addGravityComponent` and applied every
tick by `createGravityEcsSystem`, is the right tool for any constant,
per-entity pull. Set `amount` once when attaching, or change it at runtime,
for example to flip gravity for a puzzle mechanic:

```ts
import {
  addGravityComponent,
  createGravityEcsSystem,
  gravityId,
} from '@forge-game-engine/forge/physics';
import { Vec2 } from '@forge-game-engine/forge/math';

addGravityComponent(world, playerEntity, { amount: { x: 0, y: -600 } });

// Must run before whatever system resolves collisions
// (createCollisionResolutionEcsSystem), so this tick's gravity is reflected
// in this tick's contact/joint solve.
world.addSystem(createGravityEcsSystem(time));

// Later, e.g. to flip gravity:
const gravity = world.getComponent(playerEntity, gravityId);

if (gravity !== null) {
  Vec2.negate(gravity.amount);
}
```

## Impulses: instantaneous pushes

`applyImpulse(impulse, worldPoint, entityPosition, rigidBody)`
changes a `RigidBodyEcsComponent`'s velocity (and, if `worldPoint` is
off-center, its angular velocity) immediately. Use it for jumps, recoil, and
reactions to a single event:

```ts
import { applyImpulse, rigidBodyId } from '@forge-game-engine/forge/physics';
import { positionId } from '@forge-game-engine/forge/common';
import { Vec2 } from '@forge-game-engine/forge/math';

const position = world.getComponent(playerEntity, positionId);
const rigidBody = world.getComponent(playerEntity, rigidBodyId);

if (position !== null && rigidBody !== null) {
  // A straight-up jump through the center of mass: no spin.
  applyImpulse({ x: 0, y: 500 }, position.world, position.world, rigidBody);
}
```

The velocity change is `impulse * (1 / rigidBody.mass)`, so the same impulse
moves a light, low-density body much further than a heavy one. If a jump
feels too weak or too strong after changing a body's density, that's
usually why; tune the impulse magnitude alongside density rather than in
isolation.

:::caution
There's no continuous "apply force" helper, only impulses and gravity. For a
continuous linear push like wind or thrust, scale the impulse by
`deltaTimeInSeconds` and apply it every tick, the same way gravity is
integrated:

```ts
applyImpulse(
  wind.multiply(deltaTimeInSeconds),
  position.world,
  position.world,
  rigidBody,
);
```

Calling `applyImpulse` with the same vector every frame without scaling by
`deltaTimeInSeconds` makes the push frame-rate dependent, the same bug
`deltaTime` exists to avoid elsewhere. Rotation has a dedicated continuous
API, `applyTorque`, covered next; you don't need this impulse-scaling
workaround for spin.
:::

## Torque: spinning a body

`applyTorque(torque, deltaTimeInSeconds, rigidBody)`
changes a `RigidBodyEcsComponent`'s `angularVelocity` by `torque /
momentOfInertia * deltaTimeInSeconds`, the rotational equivalent of
gravity's linear acceleration. Unlike `applyImpulse`, it already takes
`deltaTimeInSeconds`, so call it every tick with the same torque value for
a continuous spin (a thruster, a fan, a car engine), or once for an
instantaneous twist:

```ts
import { applyTorque, rigidBodyId } from '@forge-game-engine/forge/physics';

// A continuous thruster torque, called every tick while held.
const rigidBody = world.getComponent(spaceshipEntity, rigidBodyId);

if (rigidBody !== null) {
  applyTorque(50, deltaTimeInSeconds, rigidBody);
}
```

The angular velocity change is `torque / momentOfInertia`, scaled by time,
so a body with a large moment of inertia (a big or dense shape) spins up
more slowly than a small one under the same torque.

By default a spinning body keeps its `angularVelocity` forever once nothing
is driving it anymore, exactly like gravity-free linear motion. Set
`angularDrag` (`0` by default) on `RigidBodyEcsComponent` to have
`createEulerIntegrationEcsSystem` damp `angularVelocity` towards `0` every
tick instead, useful for anything that should coast to a stop rather than
spin indefinitely, like a thruster-spun wheel with some friction in its
bearing:

```ts
addRigidBodyComponent(world, wheelEntity, {
  mass: wheelCollider.mass,
  momentOfInertia: wheelCollider.momentOfInertia,
  angularDrag: 1.5,
});
```

### ECS integration: `AngularVelocityMotorEcsComponent`

For a one-shot or player-driven torque, there's no dedicated ECS component:
write a small system for it in your own game code, querying for whatever
component identifies the entity (a `ThrusterEcsComponent`, a tag, ...)
alongside `RigidBodyEcsComponent`, and call `applyTorque` directly. This
mirrors `applyImpulse`, which also has no ECS component of its own; see the
Torque and Motors demo's `ThrusterEcsComponent`/`createThrusterEcsSystem`
for a worked example.

For holding a target rotation speed, use
`AngularVelocityMotorEcsComponent`
(attached via `addAngularVelocityMotorComponent`) instead: it drives the
body towards a `targetVelocity` (rad/s), spending no more than `maxTorque`
(N·m) per tick to get there. This one _is_ a built-in engine component,
since the torque-to-reach-target-velocity calculation is non-trivial and
broadly reusable (a fan settling at its rated RPM, a car wheel matching
throttle input), unlike a one-shot or manually-driven torque, which is just
a direct `applyTorque` call away. Unlike a joint, it's recomputed fresh from
the body's current angular velocity every tick rather than warm-started, so
it automatically recovers after an external disturbance (a collision, a
gust knocking the body off course).

```ts
import {
  addAngularVelocityMotorComponent,
  createAngularVelocityMotorEcsSystem,
} from '@forge-game-engine/forge/physics';

// A fan blade that spins up to 8 rad/s, limited to 40 N·m of torque.
addAngularVelocityMotorComponent(world, fanEntity, {
  targetVelocity: 8,
  maxTorque: 40,
});

// Must run before whatever system integrates velocity into position
// (createEulerIntegrationEcsSystem).
world.addSystem(createAngularVelocityMotorEcsSystem(time));
```

:::caution[Registration order]
`createAngularVelocityMotorEcsSystem` (and any custom torque-applying
system you write) must run before whatever system integrates velocity into
position (`createEulerIntegrationEcsSystem`). Registering it after means
torque applied this tick isn't reflected until the next one.
:::

## Springs and dampers: soft connections between two bodies

`LinearSpringEcsComponent`
and
`LinearDamperEcsComponent`
are continuous, position/velocity-based forces connecting two bodies'
anchor points, rather than a single body driven towards a target. Reach for
these for anything that should behave like a soft connection instead of a
rigid one, most commonly vehicle suspension: a spring supports the
chassis's weight and pushes a wheel back down after it hits a bump, while a
damper (the shock absorber) dissipates the spring's energy so the wheel
doesn't bounce forever.

A `LinearSpringEcsComponent` follows Hooke's Law, `F = -k * x`: the further
its two anchors are from `restLength` apart, the harder it pulls (if
stretched) or pushes (if compressed) them back towards it. `stiffness` is
`k`. Attach one with
`addLinearSpringComponent`,
then register
`createLinearSpringEcsSystem`
to have the force applied every tick:

```ts
import {
  addLinearSpringComponent,
  createLinearSpringEcsSystem,
} from '@forge-game-engine/forge/physics';

const suspensionEntity = world.createEntity();

// chassis and wheel are entities with their own PositionEcsComponent,
// RotationEcsComponent, and RigidBodyEcsComponent, created the same way as
// in Bodies and Shapes.
addLinearSpringComponent(world, suspensionEntity, {
  entityA: chassis,
  entityB: wheel,
  restLength: 40,
  stiffness: 800,
});

// Must run before whatever system resolves collisions
// (createCollisionResolutionEcsSystem), the same as gravity.
world.addSystem(createLinearSpringEcsSystem(time));
```

A `LinearDamperEcsComponent` follows `F = -c * v`, where `v` is the anchors'
relative speed along the line between them (their compression/extension
speed, not their full relative velocity), and `dampingCoefficient` is `c`. A
spring alone oscillates indefinitely once disturbed; pair it with a damper
sharing the same entities (and usually the same anchors) to bleed off that
energy. Attach one with
`addLinearDamperComponent`,
then register
`createLinearDamperEcsSystem`:

```ts
import {
  addLinearDamperComponent,
  createLinearDamperEcsSystem,
} from '@forge-game-engine/forge/physics';

addLinearDamperComponent(world, suspensionEntity, {
  entityA: chassis,
  entityB: wheel,
  dampingCoefficient: 40,
});

// Must run before whatever system resolves collisions, same as the spring
// system.
world.addSystem(createLinearDamperEcsSystem(time));
```

Both default `restLength` (spring only) to the distance between the anchors
at attach time and `localAnchorA`/`localAnchorB` to each entity's own
origin, the same conventions the prismatic joint uses (see
[Choosing an axis and anchors](./joints.md#choosing-an-axis-and-anchors)).
Neither is a hard constraint solved iteratively the way a joint is; their
systems compute and apply the force directly every tick via `applyImpulse`,
scaled by `deltaTimeInSeconds`, the same continuous-force-via-scaled-impulse
pattern used for wind above - and, like gravity, they have no warm-start
state of their own.

Like a jointed entity, the spring/damper entity itself doesn't need
position/rotation components; it only references `entityA`/`entityB`, which
get their own entities.

:::caution
A spring and damper connecting the same two entities don't have to share
anchors, but usually should. Mismatched anchors mean the spring's restoring
force and the damper's resistance act along different lines, which reads as
the suspension "fighting itself" rather than settling cleanly.
:::

:::caution[Registration order]
`createLinearSpringEcsSystem` and `createLinearDamperEcsSystem` must run
before whatever system resolves collisions (`createCollisionResolutionEcsSystem`),
the same as gravity, so the tick's contact/joint solve sees this tick's
spring/damper force reflected in velocity. Registering them after means
force applied this tick isn't reflected until the next one.
:::

## Explosions: area-effect impulses

`applyExplosiveForce(world, center, force, radius)`
applies a radial impulse to every entity with a `RigidBodyEcsComponent`
within `radius` of `center`, strongest at `center` and falling off linearly
to zero at `radius`. The impulse passes through each body's center of mass,
so it never imparts spin. Entities with no `RigidBodyEcsComponent` (static
geometry) and bodies at or beyond `radius` are untouched.

A common use case is triggering an explosion at a clicked point. The physics
demo converts the screen-space mouse position to world space and calls
`applyExplosiveForce` on click:

```ts
import { Vec2 } from '@forge-game-engine/forge/math';
import {
  calculatePixelsPerUnit,
  screenToWorldSpace,
} from '@forge-game-engine/forge/rendering';
import { applyExplosiveForce } from '@forge-game-engine/forge/physics';

// world and renderContext come from your game setup; verticalWorldUnits
// matches whatever was passed to createCamera.
renderContext.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  const canvasBounds = renderContext.canvas.getBoundingClientRect();

  const screenPosition = { x: event.clientX - canvasBounds.left, y: event.clientY - canvasBounds.top };

  const pixelsPerUnit = calculatePixelsPerUnit(
    renderContext.height,
    verticalWorldUnits,
  );

  const worldPosition = screenToWorldSpace(
    screenPosition,
    Vec2.zero,
    1,
    renderContext.width,
    renderContext.height,
    pixelsPerUnit,
  );

  applyExplosiveForce(world, worldPosition, 1_000_000, 600);
});
```

Because the impulse scales with both `force` and proximity to `center`,
treat `force` and `radius` as a pair to tune together for your world's
scale; the values above suit a world using pixel-scale coordinates with
gravity around `-300`.

:::caution
`applyExplosiveForce` queries every entity with a `RigidBodyEcsComponent` to
check its distance from `center`, regardless of `radius`. An occasional
explosion triggered by player input is cheap even with hundreds of bodies,
but calling it every frame, or from many simultaneous sources, adds an
O(bodies) cost per call on top of the regular simulation step.
:::
