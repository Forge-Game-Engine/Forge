---
sidebar_position: 2
---

# Applying Forces

[`PhysicsWorld`](/Forge/docs/api/classes/PhysicsWorld) and
[`RigidBody`](/Forge/docs/api/classes/RigidBody) give you several ways to
make bodies move: a constant [`gravity`](/Forge/docs/api/classes/PhysicsWorld#gravity)
applied to every dynamic body each step, a per-body
[`applyImpulse`](/Forge/docs/api/classes/RigidBody#applyimpulse) for
instantaneous hits, a per-body
[`applyTorque`](/Forge/docs/api/classes/RigidBody#applytorque) for
continuous or one-shot spin, and a world-wide
[`applyExplosiveForce`](/Forge/docs/api/classes/PhysicsWorld#applyexplosiveforce)
for area-effect blasts. Picking the right one (and tuning its magnitude
relative to body mass) is the difference between a satisfying jump/explosion
and bodies that barely twitch or fly off the screen.

## Gravity: continuous acceleration

`gravity` is applied to every non-static body's velocity on every
[`step`](/Forge/docs/api/classes/PhysicsWorld#step), so it's the right tool
for any constant, world-wide pull. Set it once in the constructor, or change
it at runtime, for example to flip gravity for a puzzle mechanic:

```ts
physicsWorld.gravity = physicsWorld.gravity.negate();
```

## Impulses: instantaneous pushes

[`applyImpulse(impulse, contactPoint)`](/Forge/docs/api/classes/RigidBody#applyimpulse)
changes a body's velocity (and, if `contactPoint` is off-center, its angular
velocity) immediately. Use it for jumps, recoil, and reactions to a single
event:

```ts
// A straight-up jump through the center of mass: no spin.
player.applyImpulse(new Vector2(0, 500), Vector2.zero);
```

The velocity change is `impulse * body.inverseMass`, so the same impulse
moves a light, low-density body much further than a heavy one. If a jump
feels too weak or too strong after changing a body's `density`, that's
usually why; tune the impulse magnitude alongside density rather than in
isolation.

:::caution
There's no continuous "apply force" on `RigidBody`, only impulses and
`gravity`. For a continuous linear push like wind or thrust, scale the
impulse by `deltaTimeInSeconds` and apply it every step, the same way gravity
is integrated:

```ts
body.applyImpulse(wind.multiply(deltaTimeInSeconds), Vector2.zero);
```

Calling `applyImpulse` with the same vector every frame without scaling by
`deltaTimeInSeconds` makes the push frame-rate dependent, the same bug
`deltaTime` exists to avoid elsewhere. Rotation has a dedicated continuous
API, `applyTorque`, covered next; you don't need this impulse-scaling
workaround for spin.
:::

## Torque: spinning a body

[`applyTorque(torque, deltaTimeInSeconds)`](/Forge/docs/api/classes/RigidBody#applytorque)
changes a body's `angularVelocity` by `torque * inverseInertia *
deltaTimeInSeconds`, the rotational equivalent of gravity's linear
acceleration. Unlike `applyImpulse`, it already takes `deltaTimeInSeconds`,
so call it every step with the same torque value for a continuous spin (a
thruster, a fan, a car engine), or once for an instantaneous twist:

```ts
// A continuous thruster torque, called every step while held.
spaceship.applyTorque(50, deltaTimeInSeconds);
```

The angular velocity change is `torque * body.inverseInertia`, scaled by
time, so a body with a large moment of inertia (a big or dense shape) spins
up more slowly than a small one under the same torque. Has no effect on
static bodies, whose `inverseInertia` is always `0`.

By default a spinning body keeps its `angularVelocity` forever once nothing
is driving it anymore, exactly like gravity-free linear motion. Set
[`RigidBodyOptions.angularDrag`](/Forge/docs/api/interfaces/RigidBodyOptions#angulardrag)
(`0` by default) to have `PhysicsWorld.step` damp `angularVelocity` towards
`0` every step instead, useful for anything that should coast to a stop
rather than spin indefinitely, like a thruster-spun wheel with some
friction in its bearing:

```ts
const wheel = new RigidBody({ shape: new CircleShape(20), angularDrag: 1.5 });
```

### ECS integration: `AngularVelocityMotorEcsComponent`

For a one-shot or player-driven torque, there's no dedicated ECS component:
write a small system for it in your own game code, querying for whatever
component identifies the entity (a `ThrusterEcsComponent`, a tag, ...)
alongside `PhysicsBodyEcsComponent`, and call `physicsBody.applyTorque`
directly. This mirrors `applyImpulse`, which also has no ECS component of
its own; see the Torque and Motors demo's `ThrusterEcsComponent`/
`createThrusterEcsSystem` for a worked example.

For holding a target rotation speed, use
[`AngularVelocityMotorEcsComponent`](/Forge/docs/api/interfaces/AngularVelocityMotorEcsComponent)
(keyed by [`AngularVelocityMotorId`](/Forge/docs/api/variables/AngularVelocityMotorId),
attached via `addAngularVelocityMotorComponent`) instead: it drives the
body towards a `targetVelocity` (rad/s), spending no more than `maxTorque`
(N·m) per tick to get there. This one _is_ a built-in engine component,
since the torque-to-reach-target-velocity calculation is non-trivial and
broadly reusable (a fan settling at its rated RPM, a car wheel matching
throttle input), unlike a one-shot or manually-driven torque, which is just
a direct `applyTorque` call away.

```ts
import {
  addAngularVelocityMotorComponent,
  createAngularVelocityMotorEcsSystem,
  createPhysicsSyncEcsSystem,
} from '@forge-game-engine/forge/physics';

// A fan blade that spins up to 8 rad/s, limited to 40 N·m of torque.
addAngularVelocityMotorComponent(world, fanEntity, {
  targetVelocity: 8,
  maxTorque: 40,
});

// Registered before createPhysicsSyncEcsSystem, see the caution below.
world.addSystem(createAngularVelocityMotorEcsSystem(time));
world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));
```

:::caution[Registration order]
`createAngularVelocityMotorEcsSystem` (and any custom torque-applying
system you write) must run before `createPhysicsSyncEcsSystem` in the same
tick, since `createPhysicsSyncEcsSystem` is what steps `physicsWorld`.
Registering it after means torque applied this tick isn't reflected until
the next one. `EcsWorld.update` runs systems in the order they were added
to `addSystem` (ties broken by `registrationOrder`), so either add the
torque system first, as above, or pass it an earlier `registrationOrder`
(`SystemRegistrationOrder.early`) if your setup order can't be changed.
:::

## Springs and dampers: soft connections between two bodies

[`LinearSpringEcsComponent`](/Forge/docs/api/interfaces/LinearSpringEcsComponent)
and
[`LinearDamperEcsComponent`](/Forge/docs/api/interfaces/LinearDamperEcsComponent)
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
[`addLinearSpringComponent`](/Forge/docs/api/functions/addLinearSpringComponent)
(keyed by
[`LinearSpringId`](/Forge/docs/api/variables/LinearSpringId)), then register
[`createLinearSpringEcsSystem`](/Forge/docs/api/functions/createLinearSpringEcsSystem)
to have the force applied every tick:

```ts
import {
  addLinearSpringComponent,
  createLinearSpringEcsSystem,
  createPhysicsSyncEcsSystem,
} from '@forge-game-engine/forge/physics';

const suspensionEntity = world.createEntity();

// chassis and wheel are the RigidBody instances backing their own entities'
// PhysicsBodyEcsComponent, created the same way as in Bodies and Shapes.
addLinearSpringComponent(world, suspensionEntity, {
  bodyA: chassis,
  bodyB: wheel,
  restLength: 40,
  stiffness: 800,
});

// Registered before createPhysicsSyncEcsSystem, see the caution below.
world.addSystem(createLinearSpringEcsSystem(time));
world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));
```

A `LinearDamperEcsComponent` follows `F = -c * v`, where `v` is the anchors'
relative speed along the line between them (their compression/extension
speed, not their full relative velocity), and `dampingCoefficient` is `c`. A
spring alone oscillates indefinitely once disturbed; pair it with a damper
sharing the same bodies (and usually the same anchors) to bleed off that
energy. Attach one with
[`addLinearDamperComponent`](/Forge/docs/api/functions/addLinearDamperComponent)
(keyed by
[`LinearDamperId`](/Forge/docs/api/variables/LinearDamperId)), then register
[`createLinearDamperEcsSystem`](/Forge/docs/api/functions/createLinearDamperEcsSystem):

```ts
import {
  addLinearDamperComponent,
  createLinearDamperEcsSystem,
} from '@forge-game-engine/forge/physics';

addLinearDamperComponent(world, suspensionEntity, {
  bodyA: chassis,
  bodyB: wheel,
  dampingCoefficient: 40,
});

// Registered before createPhysicsSyncEcsSystem, same as the spring system.
world.addSystem(createLinearDamperEcsSystem(time));
```

Both default `restLength` (spring only) to the distance between the anchors
at attach time and `anchorA`/`anchorB` to each body's center of mass, the
same conventions `PrismaticJoint` uses (see
[Choosing an axis and anchors](./joints.md#choosing-an-axis-and-anchors)).
Neither is a hard constraint solved by `PhysicsWorld` the way a `Joint` is;
they have no registration step of their own, and their systems compute and
apply the force directly every tick via `RigidBody.applyImpulse`, scaled by
`deltaTimeInSeconds`, the same continuous-force-via-scaled-impulse pattern
used for wind above.

Like a jointed entity, the spring/damper entity itself doesn't need
position/rotation components; it only references `bodyA`/`bodyB`, which get
their own entities.

:::caution
A spring and damper connecting the same two bodies don't have to share
anchors, but usually should. Mismatched anchors mean the spring's restoring
force and the damper's resistance act along different lines, which reads as
the suspension "fighting itself" rather than settling cleanly.
:::

:::caution[Registration order]
`createLinearSpringEcsSystem` and `createLinearDamperEcsSystem` must run
before `createPhysicsSyncEcsSystem` in the same tick, since
`createPhysicsSyncEcsSystem` is what steps `physicsWorld`. Registering them
after means force applied this tick isn't reflected until the next one.
`EcsWorld.update` runs systems in the order they were added to `addSystem`
(ties broken by `registrationOrder`), so either add them first, as above, or
pass an earlier `registrationOrder` (`SystemRegistrationOrder.early`) if your
setup order can't be changed.
:::

## Explosions: area-effect impulses

[`applyExplosiveForce(center, force, radius)`](/Forge/docs/api/classes/PhysicsWorld#applyexplosiveforce)
applies a radial impulse to every non-static body within `radius` of
`center`, strongest at `center` and falling off linearly to zero at
`radius`. The impulse passes through each body's center of mass, so it never
imparts spin. Static bodies and bodies at or beyond `radius` are untouched.

A common use case is triggering an explosion at a clicked point. The physics
demo converts the screen-space mouse position to world space and calls
`applyExplosiveForce` on click:

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import { screenToWorldSpace } from '@forge-game-engine/forge/rendering';

// physicsWorld and renderContext come from your game setup.
renderContext.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  const canvasBounds = renderContext.canvas.getBoundingClientRect();

  const screenPosition = new Vector2(
    event.clientX - canvasBounds.left,
    event.clientY - canvasBounds.top,
  );

  const worldPosition = screenToWorldSpace(
    screenPosition,
    Vector2.zero,
    1,
    renderContext.canvas.width,
    renderContext.canvas.height,
  );

  physicsWorld.applyExplosiveForce(worldPosition, 8_000_000, 200);
});
```

Because the impulse scales with both `force` and proximity to `center`,
treat `force` and `radius` as a pair to tune together for your world's
scale; the values above suit a world using pixel-scale coordinates with
gravity around `-300`.

:::caution
`applyExplosiveForce` loops over every body in the world to check its
distance from `center`, regardless of `radius`. An occasional explosion
triggered by player input is cheap even with hundreds of bodies, but calling
it every frame, or from many simultaneous sources, adds an O(bodies) cost
per call on top of the regular simulation step.
:::
