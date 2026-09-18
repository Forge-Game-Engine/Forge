import { describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  positionId,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { addAabbComponent } from '../components/aabb-component.js';
import { addColliderComponent } from '../components/collider-component.js';
import { addRigidBodyComponent } from '../components/rigidbody-component.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';
import { ContactConstraint } from '../types/contact-constraint.js';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import { createCollisionResolutionEcsSystem } from './collision-resolution-system.js';
import { createContinuousCollisionEcsSystem } from './continuous-collision-system.js';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';
import { createNarrowPhaseEcsSystem } from './narrow-phase-system.js';

const fixedDeltaMilliseconds = 1000 / 60;

interface TestWorld {
  world: EcsWorld;
  time: Time;
  wheelEntity: number;
  restingHeight: number;
}

/**
 * Reproduces the diagnosed Car demo bug (design/continuous-collision-
 * detection.md, §1/§3): a `wheelRadius: 100` circle falling fast enough to
 * cover ~20-25 world units in a single 60Hz tick, dropped onto a flat
 * `TerrainCollider` from a few units above its resting contact height - the
 * same "rotated 180°" terrain convention `terrain-resting-contact.test.ts`
 * and `documentation-site/docs/docs/physics/terrain.md` document (gravity
 * pulls toward -y, so the terrain is flipped to rest bodies on its +y
 * side).
 */
function buildWorld(withContinuousCollision: boolean): TestWorld {
  const world = new EcsWorld();
  const time = new Time();
  time.update(0);

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  );
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
  );

  if (withContinuousCollision) {
    world.addSystem(createContinuousCollisionEcsSystem(time));
  }

  world.addSystem(createEulerIntegrationEcsSystem(time));

  const terrainEntity = world.createEntity();

  addPositionComponent(world, terrainEntity, { world: { x: 0, y: 0 } });
  addRotationComponent(world, terrainEntity, { world: Math.PI });
  addColliderComponent(world, terrainEntity, {
    collider: new TerrainCollider(
      [
        { x: -1000, y: 0 },
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
      ],
      500,
    ),
  });
  addAabbComponent(world, terrainEntity);

  const radius = 100;
  const restingHeight = radius;
  const startPosition: Vector2 = { x: 0, y: restingHeight + 5 };
  const fallingVelocity: Vector2 = { x: 0, y: -1400 };

  const wheelEntity = world.createEntity();

  addPositionComponent(world, wheelEntity, { world: startPosition });
  addRotationComponent(world, wheelEntity);
  addColliderComponent(world, wheelEntity, {
    collider: new CircleCollider(radius),
    restitution: 0,
  });
  addAabbComponent(world, wheelEntity);
  addRigidBodyComponent(world, wheelEntity, {
    mass: 300,
    momentOfInertia: (300 * radius * radius) / 2,
    velocity: fallingVelocity,
  });

  return { world, time, wheelEntity, restingHeight };
}

function tick(world: EcsWorld, time: Time): void {
  time.update(time.rawTimeInMilliseconds + fixedDeltaMilliseconds);
  world.update();
}

describe('continuous collision detection integration', () => {
  it('tunnels deep into the terrain within a single tick without continuous collision detection', () => {
    const { world, time, wheelEntity, restingHeight } = buildWorld(false);

    tick(world, time);

    const position = world.getComponent(wheelEntity, positionId)!;
    const penetration = restingHeight - position.world.y;

    // Confirms this is the diagnosed bug, not just a slightly-deep contact:
    // the wheel ends up tens of units past its resting height in one tick.
    expect(penetration).toBeGreaterThan(15);
  });

  it('stays bounded at the surface within a single tick with continuous collision detection enabled', () => {
    const { world, time, wheelEntity, restingHeight } = buildWorld(true);

    tick(world, time);

    const position = world.getComponent(wheelEntity, positionId)!;
    const penetration = restingHeight - position.world.y;

    expect(penetration).toBeLessThan(1);
  });
});
