import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Random, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { Collider } from '../colliders/collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import {
  addColliderComponent,
  ColliderDefaultedOptions,
} from '../components/collider-component.js';
import { addGravityComponent } from '../components/gravity-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
  RigidBodyType,
} from '../components/rigidbody-component.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';
import { ContactConstraint } from '../types/contact-constraint.js';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import { createCollisionResolutionEcsSystem } from './collision-resolution-system.js';
import { createContinuousCollisionEcsSystem } from './continuous-collision-system.js';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';
import { createGravityEcsSystem } from './gravity-system.js';
import { createNarrowPhaseEcsSystem } from './narrow-phase-system.js';

const fixedDeltaMilliseconds = 1000 / 60;

interface Body {
  entity: number;
  position: PositionEcsComponent;
  rigidBody: RigidBodyEcsComponent;
}

function addStaticCollider(
  world: EcsWorld,
  collider: Collider,
  position: Vector2,
  rotation: number = 0,
  colliderOptions: Partial<ColliderDefaultedOptions> = {},
): number {
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: position });
  addRotationComponent(world, entity, { local: rotation });
  addColliderComponent(world, entity, {
    collider,
    restitution: 0,
    ...colliderOptions,
  });

  return entity;
}

function addBody(
  world: EcsWorld,
  collider: Collider,
  position: Vector2,
  velocity: Vector2,
  type: RigidBodyType = 'dynamic',
  colliderOptions: Partial<ColliderDefaultedOptions> = {},
): Body {
  const entity = world.createEntity();
  const positionComponent = addPositionComponent(world, entity, {
    local: position,
  });

  addRotationComponent(world, entity);
  addColliderComponent(world, entity, {
    collider,
    restitution: 0,
    ...colliderOptions,
  });

  const rigidBody = addRigidBodyComponent(world, entity, {
    mass: collider.mass,
    momentOfInertia: collider.momentOfInertia,
    velocity,
    type,
  });

  return { entity, position: positionComponent, rigidBody };
}

function box(halfSize: number): PolygonCollider {
  return new PolygonCollider([
    { x: -halfSize, y: -halfSize },
    { x: halfSize, y: -halfSize },
    { x: halfSize, y: halfSize },
    { x: -halfSize, y: halfSize },
  ]);
}

function flatTerrain(): TerrainCollider {
  return new TerrainCollider(
    [
      { x: -1000, y: 0 },
      { x: 1000, y: 0 },
    ],
    100,
  );
}

describe('createContinuousCollisionEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);

    world.addSystem(createTransformEcsSystem());
    world.addSystem(createBroadPhaseEcsSystem([]));
    world.addSystem(createEulerIntegrationEcsSystem(time));
    world.addSystem(createContinuousCollisionEcsSystem());
  });

  function tick(): void {
    time.update(time.rawTimeInMilliseconds + fixedDeltaMilliseconds);
    world.update();
  }

  it('should stop a fast circle just inside the surface it would pass through', () => {
    addStaticCollider(world, flatTerrain(), { x: 0, y: 0 });

    // 6000 units/second is 100 units this tick: far past the surface.
    const ball = addBody(
      world,
      new CircleCollider(10),
      { x: 0, y: 30 },
      { x: 0, y: -6000 },
    );

    tick();

    // Touching at y = 10, then left 1% of the radius inside.
    expect(ball.position.local.y).toBeCloseTo(9.9);
    expect(ball.position.local.x).toBeCloseTo(0);
    expect(ball.rigidBody.velocity.y).toBe(-6000);
  });

  it('should stop at the first of several colliders in the way', () => {
    addStaticCollider(world, box(10), { x: 0, y: -60 });
    addStaticCollider(world, box(10), { x: 0, y: -20 });

    const ball = addBody(
      world,
      new CircleCollider(5),
      { x: 0, y: 30 },
      { x: 0, y: -6000 },
    );

    tick();

    expect(ball.position.local.y).toBeCloseTo(-10 + 5 - 0.05);
  });

  it('should sweep against a static rigid body like a collider with none', () => {
    const entity = addStaticCollider(world, box(10), { x: 0, y: -20 });

    addRigidBodyComponent(world, entity, {
      mass: 1,
      momentOfInertia: 1,
      type: 'static',
    });

    const ball = addBody(
      world,
      new CircleCollider(5),
      { x: 0, y: 30 },
      { x: 0, y: -6000 },
    );

    tick();

    expect(ball.position.local.y).toBeCloseTo(-10 + 5 - 0.05);
  });

  it('should not sweep against kinematic or dynamic bodies', () => {
    addBody(world, box(10), { x: 0, y: -20 }, { x: 0, y: 0 }, 'kinematic');
    addBody(world, box(10), { x: 0, y: -60 }, { x: 0, y: 0 });

    const ball = addBody(
      world,
      new CircleCollider(5),
      { x: 0, y: 30 },
      { x: 0, y: -6000 },
    );

    tick();

    expect(ball.position.local.y).toBeCloseTo(-70);
  });

  it('should not sweep against sensors', () => {
    addStaticCollider(world, box(10), { x: 0, y: -20 }, 0, { sensor: true });

    const ball = addBody(
      world,
      new CircleCollider(5),
      { x: 0, y: 30 },
      { x: 0, y: -6000 },
    );

    tick();

    expect(ball.position.local.y).toBeCloseTo(-70);
  });

  it('should not stop a sensor circle', () => {
    addStaticCollider(world, box(10), { x: 0, y: -20 });

    const ball = addBody(
      world,
      new CircleCollider(5),
      { x: 0, y: 30 },
      { x: 0, y: -6000 },
      'dynamic',
      { sensor: true },
    );

    tick();

    expect(ball.position.local.y).toBeCloseTo(-70);
  });

  it("should not sweep against colliders the circle's category and mask exclude", () => {
    addStaticCollider(world, box(10), { x: 0, y: -20 }, 0, {
      category: 1 << 1,
      mask: 1 << 1,
    });

    const ball = addBody(
      world,
      new CircleCollider(5),
      { x: 0, y: 30 },
      { x: 0, y: -6000 },
    );

    tick();

    expect(ball.position.local.y).toBeCloseTo(-70);
  });

  it('should not move kinematic circles or polygon bodies', () => {
    addStaticCollider(world, flatTerrain(), { x: 0, y: 0 });

    const kinematicBall = addBody(
      world,
      new CircleCollider(10),
      { x: 0, y: 30 },
      { x: 0, y: -6000 },
      'kinematic',
    );
    const crate = addBody(
      world,
      box(10),
      { x: 100, y: 30 },
      { x: 0, y: -6000 },
    );

    tick();

    expect(kinematicBall.position.local.y).toBeCloseTo(-70);
    expect(crate.position.local.y).toBeCloseTo(-70);
  });

  it('should leave a shallow landing to the discrete pipeline', () => {
    addStaticCollider(world, flatTerrain(), { x: 0, y: 0 });

    // 1.4 units this tick, ending 0.9 units (under a tenth of the radius)
    // into the surface.
    const ball = addBody(
      world,
      new CircleCollider(10),
      { x: 0, y: 10.5 },
      { x: 0, y: -84 },
    );

    tick();

    expect(ball.position.local.y).toBeCloseTo(9.1);
  });

  it('should not slow a fast circle rolling along the surface', () => {
    addStaticCollider(world, flatTerrain(), { x: 0, y: 0 });

    const ball = addBody(
      world,
      new CircleCollider(10),
      { x: 0, y: 9.5 },
      { x: 6000, y: 0 },
    );

    tick();

    expect(ball.position.local.x).toBeCloseTo(100);
    expect(ball.position.local.y).toBeCloseTo(9.5);
  });
});

describe('continuous collision in the full physics pipeline', () => {
  /**
   * The Car demo's scale: a wheel 100 units across, gravity of 600
   * units/second², and the demo's `maxBiasSpeed`.
   */
  const wheelRadius = 100;

  /**
   * Rolling hills with a point every 50 units, like the Car demo's course.
   */
  function hillPoints(): Vector2[] {
    const random = new Random('continuous-collision');
    const points: Vector2[] = [];

    for (let x = -6000; x <= 6000; x += 50) {
      points.push({
        x,
        y: 80 * Math.sin(x / 400) + random.randomFloat(-2, 2),
      });
    }

    return points;
  }

  interface Simulation {
    wheel: Body;
    collisionManifolds: CollisionManifold[];
    tick: () => void;
  }

  function createSimulation(
    withContinuousCollision: boolean,
    wheelPosition: Vector2,
    wheelVelocity: Vector2,
  ): Simulation {
    const world = new EcsWorld();
    const time = new Time();
    const collisionPairs: CollisionPair[] = [];
    const collisionManifolds: CollisionManifold[] = [];
    const contactConstraints: ContactConstraint[] = [];

    time.update(0);

    world.addSystem(createTransformEcsSystem());
    world.addSystem(createGravityEcsSystem(time));
    world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
    world.addSystem(
      createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    );
    world.addSystem(
      createCollisionResolutionEcsSystem(
        collisionManifolds,
        contactConstraints,
        time,
        { maxBiasSpeed: 300 },
      ),
    );
    world.addSystem(createEulerIntegrationEcsSystem(time));

    if (withContinuousCollision) {
      world.addSystem(createContinuousCollisionEcsSystem());
    }

    addStaticCollider(world, new TerrainCollider(hillPoints(), 500), {
      x: 0,
      y: 0,
    });

    const wheel = addBody(
      world,
      new CircleCollider(wheelRadius),
      wheelPosition,
      wheelVelocity,
    );

    addGravityComponent(world, wheel.entity, { amount: { x: 0, y: -600 } });

    return {
      wheel,
      collisionManifolds,
      tick: () => {
        time.update(time.rawTimeInMilliseconds + fixedDeltaMilliseconds);
        world.update();
      },
    };
  }

  function deepestPenetration(simulation: Simulation, ticks: number): number {
    let deepest = 0;

    for (let i = 0; i < ticks; i++) {
      simulation.tick();

      for (const manifold of simulation.collisionManifolds) {
        deepest = Math.max(deepest, manifold.depth);
      }
    }

    return deepest;
  }

  it('should keep a wheel landing hard on terrain from sinking deep into it', () => {
    // A wheel coming down at about 1500 units/second (25 units a tick)
    // from a jump, the landing measured sinking 25-30 units into the Car
    // demo's terrain. How deep a single landing sinks depends on how close
    // to the surface the tick before contact leaves it, so drop it from
    // heights spread across one tick's fall and take the deepest.
    const deepestLanding = (withContinuousCollision: boolean): number => {
      let deepest = 0;

      for (let drop = 0; drop < 25; drop += 2.5) {
        deepest = Math.max(
          deepest,
          deepestPenetration(
            createSimulation(
              withContinuousCollision,
              { x: 0, y: 400 + drop },
              { x: 900, y: -1500 },
            ),
            60,
          ),
        );
      }

      return deepest;
    };

    expect(deepestLanding(false)).toBeGreaterThan(0.2 * wheelRadius);
    expect(deepestLanding(true)).toBeLessThanOrEqual(0.1 * wheelRadius);
  });

  it('should not slow a fast wheel rolling over bumpy terrain', () => {
    const distanceRolled = (withContinuousCollision: boolean): number => {
      const simulation = createSimulation(
        withContinuousCollision,
        { x: 0, y: 200 },
        { x: 1500, y: 0 },
      );

      for (let i = 0; i < 180; i++) {
        simulation.tick();
      }

      return simulation.wheel.position.local.x;
    };

    const withoutSweep = distanceRolled(false);

    expect(withoutSweep).toBeGreaterThan(2000);
    expect(distanceRolled(true)).toBeCloseTo(withoutSweep, -1);
  });
});
