# Example Use Cases

## Temporary Visual Effects

Create visual effects that automatically disappear after a set duration.

```ts
import {
  addLifetimeComponent,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';
import { addPositionComponent, addScaleComponent } from '@forge-game-engine/forge/common';
import { addSpriteComponent } from '@forge-game-engine/forge/rendering';

// Create an explosion effect that lasts 2 seconds
function spawnExplosion(x: number, y: number) {
  const explosion = world.createEntity();

  addPositionComponent(world, explosion, { local: new Vector2(x, y) });
  addScaleComponent(world, explosion);
  addSpriteComponent(world, explosion, explosionSprite);
  addLifetimeComponent(world, explosion, { durationSeconds: 2.0 });
  world.addTag(explosion, RemoveFromWorldLifetimeStrategyId);
}
```

## Timed Power-ups

Give an existing entity a temporary buff that expires after a duration, by
attaching the lifetime component (and disposal tag) directly to it instead of
a separate effect entity:

```ts
import {
  addLifetimeComponent,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';
import { addSpeedComponent } from '@forge-game-engine/forge/common';

// Add a speed boost that lasts 10 seconds
function activateSpeedBoost(playerEntity: number, boostedSpeed: number) {
  addSpeedComponent(world, playerEntity, { speed: boostedSpeed });
  addLifetimeComponent(world, playerEntity, { durationSeconds: 10.0 });
  world.addTag(playerEntity, RemoveFromWorldLifetimeStrategyId);
}
```

:::caution
Only tag the buffed entity with `RemoveFromWorldLifetimeStrategyId` if it's
truly disposable once the buff ends (for example a temporary pickup clone).
For a persistent entity like a player, remove the `LifetimeEcsComponent`
itself (and reset `speed` back to normal) instead of letting
`createRemoveFromWorldEcsSystem` remove the entity from the world.
:::

## Projectiles with Lifetime

Create bullets or projectiles that disappear after traveling for a certain
time, moved by a physics body's velocity:

```ts
import {
  addLifetimeComponent,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';
import { addPositionComponent, addRotationComponent } from '@forge-game-engine/forge/common';
import { addSpriteComponent } from '@forge-game-engine/forge/rendering';
import { addPhysicsBodyComponent, CircleShape, RigidBody } from '@forge-game-engine/forge/physics';
import { Vector2 } from '@forge-game-engine/forge/math';

function fireBullet(
  x: number,
  y: number,
  directionX: number,
  directionY: number,
) {
  const bullet = world.createEntity();
  const position = new Vector2(x, y);

  addPositionComponent(world, bullet, { local: position, world: position });
  addRotationComponent(world, bullet);
  addSpriteComponent(world, bullet, bulletSprite);
  addPhysicsBodyComponent(world, bullet, {
    physicsBody: new RigidBody({
      shape: new CircleShape(4),
      position,
      velocity: new Vector2(directionX * 500, directionY * 500),
    }),
  });
  addLifetimeComponent(world, bullet, { durationSeconds: 3.0 }); // Bullet exists for 3 seconds
  world.addTag(bullet, RemoveFromWorldLifetimeStrategyId);
}
```

`createPhysicsSyncEcsSystem` keeps the entity's `PositionEcsComponent` in
sync with the `RigidBody`'s simulated position every frame — see
[Bodies and Shapes](../physics/rigid-bodies.md).

## Temporary Obstacles

Create obstacles or hazards that appear and disappear on a timer.

```ts
import {
  addLifetimeComponent,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';
import { addPositionComponent, addRotationComponent } from '@forge-game-engine/forge/common';
import { addSpriteComponent } from '@forge-game-engine/forge/rendering';
import { addPhysicsBodyComponent, PolygonShape, RigidBody } from '@forge-game-engine/forge/physics';
import { Vector2 } from '@forge-game-engine/forge/math';

function spawnTemporaryWall(x: number, y: number, duration: number) {
  const wall = world.createEntity();
  const position = new Vector2(x, y);

  addPositionComponent(world, wall, { local: position, world: position });
  addRotationComponent(world, wall);
  addSpriteComponent(world, wall, wallSprite);
  addPhysicsBodyComponent(world, wall, {
    physicsBody: new RigidBody({
      shape: PolygonShape.rectangle(wallSprite.width, wallSprite.height),
      position,
      isStatic: true,
    }),
  });
  addLifetimeComponent(world, wall, { durationSeconds: duration });
  world.addTag(wall, RemoveFromWorldLifetimeStrategyId);
}

// Wall that exists for 5 seconds
spawnTemporaryWall(100, 200, 5.0);
```
