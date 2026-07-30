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
  CollisionManifold,
  CollisionPair,
  createBroadPhaseEcsSystem,
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
const ballRadius = 0.4;
const fountainMarginFromEdge = 1.5;
const fountainSpeed = 11;
const fountainAngleDegrees = 50;
const fountainAngleJitterDegrees = 10;
const fountainSpeedJitter = 0.15;
const fountainSpawnInterval = 0.25;
const maxBalls = 50;
const despawnMarginBelowGround = 3;

type FountainSide = 'left' | 'right';

/**
 * Creates a system that spawns a new ball, alternating between a fountain
 * at the left and right edges of the visible area, launched up and toward
 * the center at `fountainAngleDegrees` (with some random jitter in angle
 * and speed so balls collide at different points instead of moving in
 * lockstep). Stops spawning once `maxBalls` are alive.
 */
function createFountainSpawnEcsSystem(
  time: Time,
  random: Random,
  ballSprite: SpriteEcsComponent,
  spritesByEntity: Map<number, SpriteEcsComponent>,
  leftX: number,
  rightX: number,
  fountainY: number,
): EcsSystem<[]> {
  let elapsedSinceSpawn = 0;
  let nextSide: FountainSide = 'left';

  const spawnBall = (world: EcsWorld, side: FountainSide): void => {
    const entity = world.createEntity();
    const ballCollider = new CircleCollider(ballRadius);

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
    const position = new Vector2(side === 'left' ? leftX : rightX, fountainY);

    const sprite = addSpriteComponent(world, entity, ballSprite);
    spritesByEntity.set(entity, sprite);

    addPositionComponent(world, entity, { local: position });
    addRotationComponent(world, entity);
    addGravityComponent(world, entity);
    addRigidBodyComponent(world, entity, {
      mass: ballCollider.mass,
      momentOfInertia: ballCollider.momentOfInertia,
      velocity,
    });
    addColliderComponent(world, entity, { collider: ballCollider });
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

      if (spritesByEntity.size >= maxBalls) {
        return;
      }

      spawnBall(world, nextSide);
      nextSide = nextSide === 'left' ? 'right' : 'left';
    },
  };
}

/**
 * Creates a system that removes ball entities once they've fallen well
 * below the ground, so continuous fountain spawning doesn't grow the
 * entity count forever.
 */
function createDespawnFallenBallsEcsSystem(
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

const { game, world, renderContext, time } = createGame('demo-container');

createCamera(world, { verticalWorldUnits });

const { imageCache } = renderContext;

const [ballImage, groundImage] = await Promise.all([
  imageCache.getOrLoad('ball_blue_large.png'),
  imageCache.getOrLoad('block_square.png'),
]);

const ballSprite = createImageSprite(ballImage, renderContext, renderLayer, {
  frameDimensions: new Vector2(ballRadius * 2, ballRadius * 2),
});
const groundSprite = createImageSprite(groundImage, renderContext, renderLayer);

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

addPositionComponent(world, groundEntity, { local: groundPosition });
addRotationComponent(world, groundEntity);
addSpriteComponent(world, groundEntity, {
  ...groundSprite,
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
const fountainY = groundTopY + ballRadius;

const collisionPairs: CollisionPair[] = [];
const collisionManifolds: CollisionManifold[] = [];

world.addSystem(
  createFountainSpawnEcsSystem(
    time,
    random,
    ballSprite,
    spritesByEntity,
    fountainLeftX,
    fountainRightX,
    fountainY,
  ),
);
world.addSystem(createGravityEcsSystem(time));
world.addSystem(createEulerIntegrationEcsSystem(time));
world.addSystem(createTransformEcsSystem());
world.addSystem(
  createDespawnFallenBallsEcsSystem(
    spritesByEntity,
    -halfHeight - despawnMarginBelowGround,
  ),
);
world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
world.addSystem(createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds));
world.addSystem(
  createCollisionTintEcsSystem(collisionManifolds, spritesByEntity),
);
world.addSystem(createRenderEcsSystem(renderContext));

game.run();
