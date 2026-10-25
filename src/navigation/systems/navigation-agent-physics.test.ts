import { describe, expect, it } from 'vitest';
import { addPositionComponent } from '../../common/components/position-component.js';
import { addRotationComponent } from '../../common/components/rotation-component.js';
import { createTransformEcsSystem } from '../../common/systems/transform-system.js';
import { Time } from '../../common/time/Time.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { createOrthogonalGridLayout } from '../../math/grid-layout/create-orthogonal-grid-layout.js';
import { Vector2 } from '../../math/vector2.js';
import { CircleCollider } from '../../physics/colliders/circle-collider.js';
import { PolygonCollider } from '../../physics/colliders/polygon-collider.js';
import { addColliderComponent } from '../../physics/components/collider-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../../physics/components/rigidbody-component.js';
import { createBroadPhase } from '../../physics/broad-phase/create-broad-phase.js';
import { createBroadPhaseEcsSystem } from '../../physics/systems/broad-phase-system.js';
import { createCollisionResolutionEcsSystem } from '../../physics/systems/collision-resolution-system.js';
import { createEulerIntegrationEcsSystem } from '../../physics/systems/euler-integration-system.js';
import { createNarrowPhaseEcsSystem } from '../../physics/systems/narrow-phase-system.js';
import { CollisionManifold } from '../../physics/types/collision-manifold.js';
import { CollisionPair } from '../../physics/types/collision-pair.js';
import { ContactConstraint } from '../../physics/types/contact-constraint.js';
import {
  addNavigationAgentComponent,
  NavigationAgentEcsComponent,
  navigationAgentId,
} from '../components/navigation-agent-component.js';
import { createGridPathPlanner } from '../grid/create-grid-path-planner.js';
import { createNavigationGrid } from '../grid/create-navigation-grid.js';
import { markGridFromColliders } from '../grid/mark-grid-from-colliders.js';
import { cellRange } from '../test-helpers/cell-range.js';
import { createNavigationAgentEcsSystem } from './navigation-agent-system.js';

/** The game's own system: the unit's rigid body takes the agent's velocity. */
const createUnitVelocityEcsSystem = (): EcsSystem<
  [NavigationAgentEcsComponent, RigidBodyEcsComponent]
> => ({
  query: [navigationAgentId, rigidBodyId],
  update: (_world, { components: [agents, bodies] }) => {
    for (let i = 0; i < agents.length; i++) {
      bodies[i].velocity.x = agents[i].desiredVelocity.x;
      bodies[i].velocity.y = agents[i].desiredVelocity.y;
    }
  },
});

interface Wall {
  center: Vector2;
  width: number;
  height: number;
}

/** The distance from a point to the nearest point of a wall, `0` inside. */
const distanceToWall = (point: Vector2, wall: Wall): number =>
  Math.hypot(
    Math.max(0, Math.abs(point.x - wall.center.x) - wall.width / 2),
    Math.max(0, Math.abs(point.y - wall.center.y) - wall.height / 2),
  );

const addWall = (world: EcsWorld, { center, width, height }: Wall): void => {
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: center });
  addColliderComponent(world, entity, {
    collider: new PolygonCollider([
      { x: -width / 2, y: -height / 2 },
      { x: width / 2, y: -height / 2 },
      { x: width / 2, y: height / 2 },
      { x: -width / 2, y: height / 2 },
    ]),
  });
};

describe('navigation agents with physics', () => {
  it('walks a rigid body around walls to the target and stops there', () => {
    const world = new EcsWorld();
    const time = new Time();
    const collisionPairs: CollisionPair[] = [];
    const collisionManifolds: CollisionManifold[] = [];
    const contactConstraints: ContactConstraint[] = [];
    const unitRadius = 4;

    createBroadPhase(world);
    world.addSystem(createTransformEcsSystem(time));
    world.addSystem(createNavigationAgentEcsSystem(time));
    world.addSystem(createUnitVelocityEcsSystem());
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
    world.addSystem(createEulerIntegrationEcsSystem(time));

    // Two walls the unit has to weave between: one hanging from the top,
    // one standing on the bottom.
    const walls: Wall[] = [
      { center: { x: 88, y: 80 }, width: 16, height: 160 },
      { center: { x: 168, y: 176 }, width: 16, height: 160 },
    ];

    for (const wall of walls) {
      addWall(world, wall);
    }

    const grid = createNavigationGrid({
      cells: cellRange(16, 16),
      layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
    });

    const unit = world.createEntity();
    const start = { x: 24, y: 24 };
    const target = { x: 232, y: 232 };
    const position = addPositionComponent(world, unit, { local: start });

    addRotationComponent(world, unit);
    addRigidBodyComponent(world, unit, { fixedRotation: true });
    addColliderComponent(world, unit, {
      collider: new CircleCollider(unitRadius),
    });

    let now = 0;

    time.update(now);
    world.update();
    markGridFromColliders(world, grid, { agentRadius: unitRadius });

    const agent = addNavigationAgentComponent(world, unit, {
      planner: createGridPathPlanner(grid),
      speed: 80,
      arrivalRadius: 12,
    });

    agent.target = target;

    for (let tick = 0; tick < 1200 && agent.status !== 'arrived'; tick++) {
      now += 1000 / 60;
      time.update(now);
      world.update();

      // It walks around the walls rather than into them. (It may cross
      // the corner of a cell the bake blocked, since it turns up to
      // `arrivalRadius` before each corner, but never touches a wall.)
      for (const wall of walls) {
        expect(distanceToWall(position.world, wall)).toBeGreaterThan(
          unitRadius,
        );
      }
    }

    expect(agent.status).toBe('arrived');
    expect(agent.path.length).toBeGreaterThan(3);
    expect(
      Math.hypot(position.world.x - target.x, position.world.y - target.y),
    ).toBeLessThan(1e-6);
  });
});
