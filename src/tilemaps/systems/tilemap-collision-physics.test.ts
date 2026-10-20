import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
  GridLayout,
  Vector2,
} from '../../math/index.js';
import { ChainCollider } from '../../physics/colliders/chain-collider.js';
import { CircleCollider } from '../../physics/colliders/circle-collider.js';
import { PolygonCollider } from '../../physics/colliders/polygon-collider.js';
import { addColliderComponent } from '../../physics/components/collider-component.js';
import { addGravityComponent } from '../../physics/components/gravity-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from '../../physics/components/rigidbody-component.js';
import { createBroadPhaseEcsSystem } from '../../physics/systems/broad-phase-system.js';
import { createCollisionResolutionEcsSystem } from '../../physics/systems/collision-resolution-system.js';
import { createContinuousCollisionEcsSystem } from '../../physics/systems/continuous-collision-system.js';
import { createEulerIntegrationEcsSystem } from '../../physics/systems/euler-integration-system.js';
import { createGravityEcsSystem } from '../../physics/systems/gravity-system.js';
import { createNarrowPhaseEcsSystem } from '../../physics/systems/narrow-phase-system.js';
import { CollisionManifold } from '../../physics/types/collision-manifold.js';
import { CollisionPair } from '../../physics/types/collision-pair.js';
import { ContactConstraint } from '../../physics/types/contact-constraint.js';
import { fillTiles } from '../cells/edit-tiles.js';
import { addTilemapColliderComponent } from '../components/tilemap-collider-component.js';
import {
  addTilemapLayerComponent,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';
import {
  collisionTestTile,
  createCollisionTestTileSet,
  fullTileIndex,
  slopeTileIndex,
} from '../test-helpers/create-collision-test-tile-set.js';
import { createTilemapColliderEcsSystem } from './tilemap-collider-system.js';

const fixedDeltaMilliseconds = 1000 / 60;
const full = collisionTestTile(fullTileIndex);

interface Body {
  entity: number;
  position: PositionEcsComponent;
  rigidBody: RigidBodyEcsComponent;
}

/**
 * Tile layers in the real physics pipeline: the tilemap collider system
 * first, then the transform system and the physics systems in the order
 * the physics guide gives.
 */
describe('tile layer collision in the physics pipeline', () => {
  let world: EcsWorld;
  let time: Time;
  let collisionManifolds: CollisionManifold[];
  let layerEntity: number;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);

    const collisionPairs: CollisionPair[] = [];
    const contactConstraints: ContactConstraint[] = [];

    collisionManifolds = [];

    world.addSystem(createTilemapColliderEcsSystem());
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
      ),
    );
    world.addSystem(createEulerIntegrationEcsSystem(time));
    world.addSystem(createContinuousCollisionEcsSystem());
  });

  function addLayer(
    layout: GridLayout,
    friction: number,
  ): TilemapLayerEcsComponent {
    layerEntity = world.createEntity();
    addPositionComponent(world, layerEntity);
    addColliderComponent(world, layerEntity, {
      collider: new ChainCollider([]),
      friction,
      restitution: 0,
    });
    addTilemapColliderComponent(world, layerEntity);

    return addTilemapLayerComponent(world, layerEntity, {
      tileSet: createCollisionTestTileSet(layout),
    });
  }

  function addBody(
    collider: CircleCollider | PolygonCollider,
    start: Vector2,
    friction: number,
    gravity: Vector2 = { x: 0, y: 9.81 },
  ): Body {
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, { local: start });

    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider,
      friction,
      restitution: 0,
    });
    addGravityComponent(world, entity, { amount: gravity });

    return {
      entity,
      position,
      rigidBody: addRigidBodyComponent(world, entity),
    };
  }

  function box(width: number, height: number): PolygonCollider {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return new PolygonCollider([
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight },
    ]);
  }

  function tick(): void {
    time.update(time.rawTimeInMilliseconds + fixedDeltaMilliseconds);
    world.update();
  }

  /** The direction the layer pushes the body in each of this tick's contacts. */
  function layerPushes(body: Body): Vector2[] {
    return collisionManifolds
      .filter(
        (manifold) =>
          manifold.entityA === body.entity || manifold.entityB === body.entity,
      )
      .map(({ entityA, normal }) =>
        entityA === layerEntity ? normal : { x: -normal.x, y: -normal.y },
      );
  }

  const unitSquares = createOrthogonalGridLayout({
    cellWidth: 1,
    cellHeight: 1,
  });

  it('keeps a frictionless box sliding along a 20-tile floor at its speed', () => {
    const layer = addLayer(unitSquares, 0);

    fillTiles(layer, 0, 0, 20, 1, full);

    const body = addBody(box(1, 0.5), { x: 2, y: -0.25 }, 0);

    for (let i = 0; i < 30; i++) {
      tick();
    }

    let checkedContacts = 0;

    body.rigidBody.velocity.x = 5;

    // Two seconds at 5 units a second carries it across ten tile joints.
    for (let i = 0; i < 120; i++) {
      tick();

      for (const push of layerPushes(body)) {
        checkedContacts++;
        expect(Math.abs(push.x)).toBeLessThan(1e-6);
        expect(push.y).toBeLessThan(0);
      }
    }

    expect(checkedContacts).toBeGreaterThanOrEqual(120);
    expect(body.rigidBody.velocity.x).toBeCloseTo(5, 6);
    expect(body.position.world.x).toBeGreaterThan(11.5);
    expect(body.position.world.y).toBeCloseTo(-0.25, 1);
  });

  it('lands a circle on a slope and rolls it down', () => {
    const layer = addLayer(unitSquares, 0.6);

    // A floor along row 1, with a slope at (5, 0) rising to the right onto
    // a block of full tiles.
    fillTiles(layer, 0, 1, 12, 1, full);
    fillTiles(layer, 6, 0, 3, 1, full);
    fillTiles(layer, 5, 0, 1, 1, collisionTestTile(slopeTileIndex));

    const radius = 0.2;
    const body = addBody(new CircleCollider(radius), { x: 5.6, y: -1 }, 0.6);
    let landedAt: Vector2 | null = null;

    for (let i = 0; i < 60 && !landedAt; i++) {
      tick();

      if (layerPushes(body).length > 0) {
        landedAt = { ...body.position.world };
      }
    }

    // The slope's surface is the line x + y = 6, so the circle's center
    // rests a radius above it.
    expect(landedAt).not.toBeNull();
    expect(
      ((landedAt?.x ?? 0) + (landedAt?.y ?? 0) - 6) / Math.SQRT2,
    ).toBeCloseTo(-radius, 1);

    for (let i = 0; i < 120; i++) {
      tick();
    }

    // Down the slope is towards -x, onto the floor whose top is y = 1.
    expect(body.position.world.x).toBeLessThan(5);
    expect(body.rigidBody.velocity.x).toBeLessThan(0);
    expect(body.position.world.y).toBeCloseTo(1 - radius, 1);
  });

  it('slides a circle along an isometric wall’s diagonal edge without catching on tile joints', () => {
    const diamonds = createIsometricGridLayout({ cellWidth: 2, cellHeight: 1 });
    const layer = addLayer(diamonds, 0);

    // A row of cells along the column axis. Its top-right edge runs from
    // (0, 0) to (10, 5), down and to the right; solid is below and left.
    fillTiles(layer, 0, 0, 10, 1, full);

    const tangent = { x: 2 / Math.sqrt(5), y: 1 / Math.sqrt(5) };
    const outward = { x: 1 / Math.sqrt(5), y: -2 / Math.sqrt(5) };
    const radius = 0.2;
    const speed = 3;
    const start = { x: 1.5 + outward.x * radius, y: 0.75 + outward.y * radius };
    // Gravity presses the circle into the wall, so it stays in contact.
    const body = addBody(new CircleCollider(radius), { ...start }, 0, {
      x: -outward.x * 9.81,
      y: -outward.y * 9.81,
    });

    body.rigidBody.velocity.x = tangent.x * speed;
    body.rigidBody.velocity.y = tangent.y * speed;

    let checkedContacts = 0;

    // A second at 3 units a second crosses two tile joints.
    for (let i = 0; i < 60; i++) {
      tick();

      for (const push of layerPushes(body)) {
        checkedContacts++;
        expect(push.x * outward.x + push.y * outward.y).toBeGreaterThan(
          1 - 1e-6,
        );
      }
    }

    const { velocity } = body.rigidBody;
    const moved = {
      x: body.position.local.x - start.x,
      y: body.position.local.y - start.y,
    };

    expect(checkedContacts).toBeGreaterThan(50);
    expect(velocity.x * tangent.x + velocity.y * tangent.y).toBeCloseTo(
      speed,
      4,
    );
    expect(moved.x * tangent.x + moved.y * tangent.y).toBeCloseTo(speed, 1);
    expect(moved.x * outward.x + moved.y * outward.y).toBeCloseTo(0, 2);
  });

  it('drops a resting box on the tick the tiles under it are cleared', () => {
    const layer = addLayer(unitSquares, 0.6);

    fillTiles(layer, 0, 0, 10, 1, full);

    const body = addBody(box(0.5, 0.5), { x: 5.5, y: -0.25 }, 0.6);

    for (let i = 0; i < 60; i++) {
      tick();
    }

    expect(layerPushes(body).length).toBeGreaterThan(0);
    expect(body.rigidBody.velocity.y).toBeCloseTo(0, 3);

    fillTiles(layer, 4, 0, 3, 1, 0);
    tick();

    expect(layerPushes(body)).toEqual([]);
    expect(body.rigidBody.velocity.y).toBeGreaterThan(0);
  });

  it('keeps a box at rest while a distant tile is edited every tick', () => {
    const layer = addLayer(unitSquares, 0.6);

    fillTiles(layer, 0, 0, 10, 1, full);

    const body = addBody(box(1, 0.5), { x: 3, y: -0.25 }, 0.6);

    for (let i = 0; i < 60; i++) {
      tick();
    }

    const rested = { ...body.position.world };

    for (let i = 0; i < 60; i++) {
      fillTiles(layer, 50, 0, 1, 1, i % 2 === 0 ? full : 0);
      tick();
    }

    expect(body.position.world.x).toBeCloseTo(rested.x, 3);
    expect(body.position.world.y).toBeCloseTo(rested.y, 3);
    expect(
      Math.hypot(body.rigidBody.velocity.x, body.rigidBody.velocity.y),
    ).toBeLessThan(1e-2);
  });
});
