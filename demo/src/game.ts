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
  degreesToRadians,
  EcsSystem,
  EcsWorld,
  PositionEcsComponent,
  positionId,
  Random,
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
} from '../../src/physics';

const renderLayer = 1;
const verticalWorldUnits = 10;
const groundThickness = 1;
const shapeSize = 0.2;
const fountainMarginFromEdge = 1.5;
const fountainSpeed = 15;
const fountainAngleDegrees = 80;
const fountainAngleJitterDegrees = 10;
const fountainSpeedJitter = 0.15;
const fountainSpawnInterval = 0.01;
const shapesSpawnedPerInterval = 15;
const maxShapes = 2000;
const despawnMarginBelowGround = 3;
const polygonAngularVelocitySpread = 4;

type FountainSide = 'left' | 'right';

/**
 * A spawnable shape kind: pairs the sprite to render with a factory for the
 * matching collider, both sized off `shapeSize`, plus how much initial spin
 * to give the entity (circles look the same at any rotation, so they get
 * none).
 */
interface ShapeTemplate {
  sprite: SpriteEcsComponent;
  createCollider: () => Collider;
  angularVelocitySpread: number;
}

/**
 * Creates a system that spawns a new randomly-chosen shape, alternating
 * between a fountain at the left and right edges of the visible area,
 * launched up and toward the center at `fountainAngleDegrees` (with some
 * random jitter in angle and speed so shapes collide at different points
 * instead of moving in lockstep). Stops spawning once `maxShapes` are
 * alive.
 */
function createFountainSpawnEcsSystem(
  time: Time,
  random: Random,
  shapeTemplates: ShapeTemplate[],
  spritesByEntity: Map<number, SpriteEcsComponent>,
  leftX: number,
  rightX: number,
  fountainY: number,
): EcsSystem<[]> {
  let elapsedSinceSpawn = 0;
  let nextSide: FountainSide = 'left';

  const spawnShape = (world: EcsWorld, side: FountainSide): void => {
    const entity = world.createEntity();
    const template =
      shapeTemplates[random.randomInt(0, shapeTemplates.length - 1)];
    const collider = template.createCollider();

    const angle = degreesToRadians(
      fountainAngleDegrees +
        random.randomFloat(
          -fountainAngleJitterDegrees,
          fountainAngleJitterDegrees,
        ),
    );
    const speed =
      fountainSpeed *
      random.randomFloat(1 - fountainSpeedJitter, 1 + fountainSpeedJitter);
    const horizontalDirection = side === 'left' ? 1 : -1;

    const velocity = new Vector2(
      Math.cos(angle) * speed * horizontalDirection,
      Math.sin(angle) * speed,
    );
    const angularVelocity = random.randomFloat(
      -template.angularVelocitySpread,
      template.angularVelocitySpread,
    );
    const position = new Vector2(side === 'left' ? leftX : rightX, fountainY);

    const sprite = addSpriteComponent(world, entity, template.sprite);
    spritesByEntity.set(entity, sprite);

    addPositionComponent(world, entity, { world: position });
    addRotationComponent(world, entity, { world: 0 });
    addGravityComponent(world, entity);
    addRigidBodyComponent(world, entity, {
      mass: collider.mass,
      momentOfInertia: collider.momentOfInertia,
      velocity,
      angularVelocity,
    });
    addColliderComponent(world, entity, { collider });
    addAabbComponent(world, entity);
  };

  return {
    query: [],
    update: (world) => {
      elapsedSinceSpawn += time.deltaTimeInSeconds;

      if (elapsedSinceSpawn < fountainSpawnInterval) {
        return;
      }

      elapsedSinceSpawn -= fountainSpawnInterval;

      if (spritesByEntity.size >= maxShapes) {
        return;
      }

      for (let i = 0; i < shapesSpawnedPerInterval; i++) {
        spawnShape(world, nextSide);
        nextSide = nextSide === 'left' ? 'right' : 'left';
      }
    },
  };
}

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

function createSquareCollider(): PolygonCollider {
  const half = shapeSize / 2;

  return new PolygonCollider([
    new Vector2(-half, -half),
    new Vector2(half, -half),
    new Vector2(half, half),
    new Vector2(-half, half),
  ]);
}

/**
 * `Triangle.png` is a right triangle with its right angle at the
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

const [ballImage, squareImage, triangleImage] = await Promise.all([
  imageCache.getOrLoad('ball_blue_large.png'),
  imageCache.getOrLoad('block_square.png'),
  imageCache.getOrLoad('Triangle.png'),
]);

const ballSprite = createImageSprite(ballImage, renderContext, renderLayer, {
  frameDimensions: new Vector2(shapeSize, shapeSize),
});
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

triangleSprite.pivot = trianglePivot.clone();

const shapeTemplates: ShapeTemplate[] = [
  {
    sprite: ballSprite,
    createCollider: () => new CircleCollider(shapeSize / 2),
    angularVelocitySpread: 0,
  },
  {
    sprite: squareSprite,
    createCollider: createSquareCollider,
    angularVelocitySpread: polygonAngularVelocitySpread,
  },
  {
    sprite: triangleSprite,
    createCollider: createTriangleCollider,
    angularVelocitySpread: polygonAngularVelocitySpread,
  },
];

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
addRotationComponent(world, groundEntity, { world: 0 });
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

const random = new Random();
const fountainLeftX = -halfWidth + fountainMarginFromEdge;
const fountainRightX = halfWidth - fountainMarginFromEdge;
const fountainY = groundTopY + shapeSize / 2;

const collisionPairs: CollisionPair[] = [];
const collisionManifolds: CollisionManifold[] = [];
const contactConstraints: ContactConstraint[] = [];

world.addSystem(
  createFountainSpawnEcsSystem(
    time,
    random,
    shapeTemplates,
    spritesByEntity,
    fountainLeftX,
    fountainRightX,
    fountainY,
  ),
);
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
