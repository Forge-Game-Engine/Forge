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

### ECS integration: `AppliedTorqueEcsComponent` and `AngularVelocityMotorEcsComponent`

Two components wrap `applyTorque` for entities with a
`PhysicsBodyEcsComponent`:

- [`AppliedTorqueEcsComponent`](/Forge/docs/api/interfaces/AppliedTorqueEcsComponent)
  (keyed by [`AppliedTorqueId`](/Forge/docs/api/variables/AppliedTorqueId),
  attached via `addAppliedTorqueComponent`) applies its `value` (N·m) to the
  body every tick, then resets `value` back to `0`. Set `value` again each
  tick you want the torque to keep acting; a value set once produces a
  single kick, the same distinction as a one-time `applyImpulse` versus a
  value re-applied every frame.
- [`AngularVelocityMotorEcsComponent`](/Forge/docs/api/interfaces/AngularVelocityMotorEcsComponent)
  (keyed by [`AngularVelocityMotorId`](/Forge/docs/api/variables/AngularVelocityMotorId),
  attached via `addAngularVelocityMotorComponent`) drives the body towards a
  `targetVelocity` (rad/s), spending no more than `maxTorque` (N·m) per tick
  to get there. Use this instead of `AppliedTorqueEcsComponent` when you want
  to hold a rotation speed (a fan settling at its rated RPM, a car wheel
  matching throttle input) rather than manage the torque value yourself.

```ts
import {
  addAngularVelocityMotorComponent,
  addAppliedTorqueComponent,
  createAngularVelocityMotorEcsSystem,
  createAppliedTorqueEcsSystem,
  createPhysicsEcsSystem,
} from '@forge-game-engine/forge/physics';

// A fan blade that spins up to 8 rad/s, limited to 40 N·m of torque.
addAngularVelocityMotorComponent(world, fanEntity, {
  targetVelocity: 8,
  maxTorque: 40,
});

// A thruster the player fires by setting `value` while a key is held.
addAppliedTorqueComponent(world, spaceshipEntity, { value: 0 });

// Registered before createPhysicsEcsSystem, see the caution below.
world.addSystem(createAngularVelocityMotorEcsSystem(time));
world.addSystem(createAppliedTorqueEcsSystem(time));
world.addSystem(createPhysicsEcsSystem(physicsWorld, time));
```

:::caution[Registration order]
Both systems must run before `createPhysicsEcsSystem` in the same tick,
since `createPhysicsEcsSystem` is what steps `physicsWorld`. Registering
either after means torque applied this tick isn't reflected until the next
one. `EcsWorld.update` runs systems in the order they were added to
`addSystem` (ties broken by `registrationOrder`), so either add the torque
systems first, as above, or pass them an earlier `registrationOrder`
(`SystemRegistrationOrder.early`) if your setup order can't be changed.
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
