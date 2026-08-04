import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  addGravityComponent,
  addRevoluteJointComponent,
  addRigidBodyComponent,
  CircleCollider,
  Collider,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  createImageSprite,
  NineSliceOptions,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addArmComponent } from './_arm.component';

// `ball_blue_large.png` and `block_square.png` are both native 64x64
// images. Sprites are never scaled here (the pivot marker, floor tiles, and
// ball all render at native pixel size, with physics shapes sized to
// match), with one deliberate exception: the wall bricks are explicitly
// half that size, so they're scaled down to match their smaller physics
// shape, see `createBrickTower`.
const ballRadius = 32;
const floorTileSize = 64;
const pivotRadius = floorTileSize / 2;
const floorTileCount = 3;

const brickSize = floorTileSize / 2;
const brickCount = 10;
const towerColumns = 6;

const armWidth = 14;
const gravity = Vec2.create(0, -600);

// `block_narrow.png` is a 32x128 rounded, bolted panel; these insets keep
// its rounded corners and bolt-head detail at a fixed size while the center
// stretches, instead of smearing them across the arm's length as it swings.
const armSlices: NineSliceOptions = {
  left: 8,
  right: 8,
  top: 28,
  bottom: 28,
  nativeWidth: 32,
  nativeHeight: 128,
};

// Every entity's spawn position below is an absolute world-space
// coordinate, authored directly rather than computed from another
// entity's position (e.g. the floor is not derived from the ball's rest
// position). The one exception is the joint's `localAnchorB`, which the
// revolute joint API requires as an offset local to the ball, computed once
// from `pivotPosition` and `ballStartPosition` (see `createWreckingBall`).
const pivotPosition = Vec2.create(-260, 260);
const ballStartPosition = Vec2.create(-480, 150);
// The center of the floor's middle tile. Its height was chosen so the
// floor's top surface stays below the ball's swing everywhere the floor
// spans, while the brick tower standing on it rises back up into the
// ball's path, see the comment on `floorTileCount` uses in
// `createWreckingBall`.
const floorPosition = Vec2.create(-100, -107);

interface WreckingBallSprites {
  ball: SpriteEcsComponent;
  brick: SpriteEcsComponent;
  arm: SpriteEcsComponent;
}

async function loadWreckingBallSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<WreckingBallSprites> {
  const { imageCache } = renderContext;

  const [ballImage, brickImage, armImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/block_narrow.png')),
  ]);

  return {
    ball: createImageSprite(ballImage, renderContext, renderLayer),
    brick: createImageSprite(brickImage, renderContext, renderLayer),
    arm: createImageSprite(armImage, renderContext, renderLayer),
  };
}

function rectangleVertices(width: number, height: number): Vector2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    Vec2.create(-halfWidth, -halfHeight),
    Vec2.create(halfWidth, -halfHeight),
    Vec2.create(halfWidth, halfHeight),
    Vec2.create(-halfWidth, halfHeight),
  ];
}

/**
 * Creates a single entity carrying both a sprite and the collider/rigid
 * body that represents it, positioned at `position`. Every object in this
 * scene is one entity, not a visual entity paired with a separate physics
 * entity.
 * @param world - The ECS world to add the entity to.
 * @param sprite - The sprite to render.
 * @param position - Where the entity starts.
 * @param angle - The entity's starting rotation, in radians.
 * @param collider - The entity's collider.
 * @param options - `isStatic` omits a `RigidBodyEcsComponent`/gravity
 * (default `false`); `restitution`/`friction` tune the collider; `scale`
 * renders `sprite` at other than its native pixel size.
 * @returns The created entity.
 */
function createPhysicsSpriteEntity(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
  angle: number,
  collider: Collider,
  options: {
    isStatic?: boolean;
    restitution?: number;
    friction?: number;
    scale?: Vector2;
  } = {},
): number {
  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    world: Vec2.clone(position),
    local: Vec2.clone(position),
  });
  addRotationComponent(world, entity, { local: angle, world: angle });

  if (options.scale) {
    addScaleComponent(world, entity, {
      local: options.scale,
      world: options.scale,
    });
  }

  addSpriteComponent(world, entity, sprite);
  addColliderComponent(world, entity, {
    collider,
    ...(options.restitution !== undefined && {
      restitution: options.restitution,
    }),
    ...(options.friction !== undefined && { friction: options.friction }),
  });
  addAabbComponent(world, entity);

  if (!options.isStatic) {
    addRigidBodyComponent(world, entity, {
      mass: collider.mass,
      momentOfInertia: collider.momentOfInertia,
    });
    addGravityComponent(world, entity, { amount: gravity });
  }

  return entity;
}

function createFloor(world: EcsWorld, sprite: SpriteEcsComponent): void {
  const firstTileX =
    floorPosition.x - (floorTileSize * (floorTileCount - 1)) / 2;

  for (let i = 0; i < floorTileCount; i++) {
    const position = Vec2.create(
      firstTileX + i * floorTileSize,
      floorPosition.y,
    );
    const floorCollider = new PolygonCollider(
      rectangleVertices(floorTileSize, floorTileSize),
    );

    createPhysicsSpriteEntity(world, sprite, position, 0, floorCollider, {
      isStatic: true,
    });
  }
}

function createBrickTower(world: EcsWorld, sprite: SpriteEcsComponent): void {
  const towerBottomY = floorPosition.y + floorTileSize / 2;
  const firstColumnX = floorPosition.x - (brickSize * (towerColumns - 1)) / 2;
  // The bricks are explicitly half the size of their sprite's native 64x64
  // pixels, so (unlike every other object in this scene) they need a scale
  // to match their physics shape rather than rendering at native size.
  const brickScale = Vec2.create(
    brickSize / sprite.width,
    brickSize / sprite.height,
  );

  for (let row = 0; row < brickCount; row++) {
    const y = towerBottomY + brickSize / 2 + row * brickSize;

    for (let column = 0; column < towerColumns; column++) {
      const position = Vec2.create(firstColumnX + column * brickSize, y);
      const brickCollider = new PolygonCollider(
        rectangleVertices(brickSize, brickSize),
        0.01,
      );

      createPhysicsSpriteEntity(world, sprite, position, 0, brickCollider, {
        friction: 0.6,
        scale: brickScale,
      });
    }
  }
}

/**
 * Builds a wrecking ball scene: a ball hinged to a crane by a long arm,
 * pulled back and released exactly once, when the scene is built, into a
 * `towerColumns`-wide, `brickCount`-tall wall of bricks standing on a floor
 * of tiles. Like Newton's Cradle, the joint only keeps the ball swinging
 * about the crane's pivot, knocking the wall down is ordinary collision
 * resolution between the ball and the bricks - the floor sits low enough
 * that the ball's swing clears it and only ever strikes the wall rising
 * above it.
 * @param world - The ECS world to add the scene's entities to.
 * @param renderContext - The render context used to load sprites.
 * @param renderLayer - The render layer the scene should be drawn on.
 */
export async function createWreckingBall(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const sprites = await loadWreckingBallSprites(renderContext, renderLayer);

  // A static, non-colliding pivot marker: no ColliderEcsComponent (so it
  // never participates in collision detection) and no
  // RigidBodyEcsComponent (so every joint system treats it as static).
  const pivotEntity = world.createEntity();

  addPositionComponent(world, pivotEntity, {
    world: Vec2.clone(pivotPosition),
    local: Vec2.clone(pivotPosition),
  });
  addRotationComponent(world, pivotEntity);
  addSpriteComponent(world, pivotEntity, {
    ...sprites.brick,
    width: pivotRadius * 2,
    height: pivotRadius * 2,
  });

  createFloor(world, sprites.brick);
  createBrickTower(world, sprites.brick);

  const ballCollider = new CircleCollider(ballRadius, 4);
  const ballEntity = createPhysicsSpriteEntity(
    world,
    sprites.ball,
    ballStartPosition,
    0,
    ballCollider,
    { restitution: 0.1 },
  );

  // `localAnchorB` is a local-space offset, not a world position: the ball
  // starts unrotated (angle 0), so its local frame matches world space at
  // construction, and the offset from the ball's center to the pivot is
  // just their absolute positions subtracted.
  const jointEntity = world.createEntity();

  addRevoluteJointComponent(world, jointEntity, {
    entityA: pivotEntity,
    entityB: ballEntity,
    // clone: pivotPosition is a module-level constant reused below for the arm.
    localAnchorB: Vec2.subtract(
      Vec2.clone(pivotPosition),
      ballStartPosition,
    ),
  });

  // A nine-sliced sprite, resized and rotated every tick by
  // `createArmEcsSystem` to visualize the otherwise-invisible revolute
  // joint connecting the pivot and the ball.
  const armEntity = world.createEntity();

  addPositionComponent(world, armEntity, {
    world: Vec2.clone(pivotPosition),
    local: Vec2.clone(pivotPosition),
  });
  addRotationComponent(world, armEntity);
  addSpriteComponent(world, armEntity, {
    ...sprites.arm,
    width: armWidth,
    slices: armSlices,
  });
  addArmComponent(world, armEntity, {
    pivotPosition: Vec2.clone(pivotPosition),
    entity: ballEntity,
    armWidth,
  });
}
