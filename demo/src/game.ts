import {
  addPositionComponent,
  addRotationComponent,
  addSpriteComponent,
  calculateVisibleWorldSize,
  Color,
  createCamera,
  createGame,
  createImageSprite,
  createRenderEcsSystem,
  createTransformEcsSystem,
  degreesToRadians,
  EcsSystem,
  EcsWorld,
  PositionEcsComponent,
  positionId,
  Random,
  Sprite,
  SpriteEcsComponent,
  Time,
  Vector2,
} from '../../src';
import {
  addAabbComponent,
  addColliderComponent,
  addGravityComponent,
  addRigidBodyComponent,
  CircleCollider,
  Collider,
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
  PolygonCollider,
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../../src/fphysics';

const renderLayer = 1;
const verticalWorldUnits = 10;
const groundThickness = 1;
const shapeSize = 0.5;
const fountainMarginFromEdge = 1.5;
const fountainSpeed = 15;
const fountainAngleDegrees = 50;
const fountainAngleJitterDegrees = 10;
const fountainSpeedJitter = 0.15;
const fountainSpawnInterval = 0.1;
const shapesSpawnedPerInterval = 4;
const maxShapes = 4;
const despawnMarginBelowGround = 3;
const polygonAngularVelocitySpread = 4;

/**
 * Creates a system that removes shape entities once they've fallen well
 * below the ground, so continuous fountain spawning doesn't grow the
 * entity count forever.
 */
function createDespawnFallenShapesEcsSystem(
  spritesByEntity: Map<number, SpriteEcsComponent>,
  minY: number,
): EcsSystem<[PositionEcsComponent, RigidBodyEcsComponent]> {
  return {
    query: [positionId, rigidBodyId],
    update: (world, { entities, components: [positions] }) => {
      for (let i = 0; i < entities.length; i++) {
        if (positions[i].world.y < minY) {
          world.removeEntity(entities[i]);
          spritesByEntity.delete(entities[i]);
        }
      }
    },
  };
}

/**
 * Creates a system that tints every tracked sprite red while its entity is
 * involved in a collision this tick, and white otherwise, so collision
 * detection is visible without needing collision resolution.
 */
function createCollisionTintEcsSystem(
  collisionManifolds: CollisionManifold[],
  spritesByEntity: Map<number, SpriteEcsComponent>,
): EcsSystem<[]> {
  return {
    query: [],
    update: () => {
      for (const sprite of spritesByEntity.values()) {
        sprite.tintColor = Color.white;
      }

      for (const manifold of collisionManifolds) {
        const spriteA = spritesByEntity.get(manifold.entityA);
        const spriteB = spritesByEntity.get(manifold.entityB);

        if (spriteA) {
          spriteA.tintColor = Color.red;
        }

        if (spriteB) {
          spriteB.tintColor = Color.red;
        }
      }
    },
  };
}

function spawnTriangle(
  world: EcsWorld,
  position: Vector2,
  rotation: number,
  sprite: Sprite,
) {
  const entity = world.createEntity();

  const collider = createTriangleCollider();

  addPositionComponent(world, entity, { world: position });
  addRotationComponent(world, entity, { world: rotation });
  addSpriteComponent(world, entity, sprite);
  addRigidBodyComponent(world, entity, {
    mass: collider.mass,
    momentOfInertia: collider.momentOfInertia,
  });
  addColliderComponent(world, entity, { collider });
  addGravityComponent(world, entity);
  addAabbComponent(world, entity);
}

/**
 * `block_corner_large.png` is a right triangle with its right angle at the
 * bottom-left of the image. `PolygonCollider` re-centers vertices around
 * their centroid (a third of the way across, two thirds of the way down),
 * so the sprite's pivot is moved to match in `trianglePivot`, keeping the
 * rendered triangle aligned with its collider as it rotates.
 */
const trianglePivot = new Vector2(1 / 3, 2 / 3);

function createTriangleCollider(): PolygonCollider {
  const half = shapeSize / 2;

  return new PolygonCollider([
    new Vector2(-half, half),
    new Vector2(-half, -half),
    new Vector2(half, -half),
  ]);
}

const { game, world, renderContext, time } = createGame('demo-container');

createCamera(world, { verticalWorldUnits });

const { imageCache } = renderContext;

const [squareImage, triangleImage] = await Promise.all([
  imageCache.getOrLoad('block_square.png'),
  imageCache.getOrLoad('Triangle.png'),
]);

const squareSprite = createImageSprite(
  squareImage,
  renderContext,
  renderLayer,
  { frameDimensions: new Vector2(shapeSize, shapeSize) },
);
const triangleSprite = createImageSprite(
  triangleImage,
  renderContext,
  renderLayer,
  { frameDimensions: new Vector2(shapeSize, shapeSize) },
);

triangleSprite.tintColor = Color.blue;

triangleSprite.pivot = trianglePivot.clone();

const { x: visibleWidth, y: visibleHeight } = calculateVisibleWorldSize(
  renderContext.width,
  renderContext.height,
  verticalWorldUnits,
);
const halfWidth = visibleWidth / 2;
const halfHeight = visibleHeight / 2;

const spritesByEntity = new Map<number, SpriteEcsComponent>();

const groundEntity = world.createEntity();
const groundPosition = new Vector2(0, -halfHeight + groundThickness / 2);
const groundHalfWidth = halfWidth;
const groundHalfHeight = groundThickness / 2;
const groundTopY = groundPosition.y + groundHalfHeight;

addPositionComponent(world, groundEntity, { world: groundPosition });
addRotationComponent(world, groundEntity);
addSpriteComponent(world, groundEntity, {
  ...squareSprite,
  width: visibleWidth,
  height: groundThickness,
});
addColliderComponent(world, groundEntity, {
  collider: new PolygonCollider([
    new Vector2(-groundHalfWidth, -groundHalfHeight),
    new Vector2(groundHalfWidth, -groundHalfHeight),
    new Vector2(groundHalfWidth, groundHalfHeight),
    new Vector2(-groundHalfWidth, groundHalfHeight),
  ]),
});
addAabbComponent(world, groundEntity);

spawnTriangle(world, new Vector2(0, 1), degreesToRadians(270), triangleSprite);

const collisionPairs: CollisionPair[] = [];
const collisionManifolds: CollisionManifold[] = [];
const contactConstraints: ContactConstraint[] = [];

world.addSystem(createGravityEcsSystem(time));
world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
world.addSystem(createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds));
world.addSystem(
  createCollisionResolutionEcsSystem(
    collisionManifolds,
    contactConstraints,
    time,
  ),
);
world.addSystem(createEulerIntegrationEcsSystem(time));
// world.addSystem(createTransformEcsSystem());
world.addSystem(
  createDespawnFallenShapesEcsSystem(
    spritesByEntity,
    -halfHeight - despawnMarginBelowGround,
  ),
);
world.addSystem(
  createCollisionTintEcsSystem(collisionManifolds, spritesByEntity),
);
world.addSystem(createRenderEcsSystem(renderContext));

game.run();

document.addEventListener('keydown', () => {
  console.log(time.fps);
});
