---
sidebar_position: 2
---

# Applying Forces

[`PhysicsWorld`](/Forge/docs/api/classes/PhysicsWorld) gives you three ways
to make bodies move: a constant [`gravity`](/Forge/docs/api/classes/PhysicsWorld#gravity)
applied to every dynamic body each step, a per-body
[`applyImpulse`](/Forge/docs/api/classes/RigidBody#applyimpulse) for
instantaneous hits, and a world-wide
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
`gravity`. For a continuous push like wind or thrust, scale the impulse by
`deltaTimeInSeconds` and apply it every step, the same way gravity is
integrated:

```ts
body.applyImpulse(wind.multiply(deltaTimeInSeconds), Vector2.zero);
```

Calling `applyImpulse` with the same vector every frame without scaling by
`deltaTimeInSeconds` makes the push frame-rate dependent, the same bug
`deltaTime` exists to avoid elsewhere.
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
