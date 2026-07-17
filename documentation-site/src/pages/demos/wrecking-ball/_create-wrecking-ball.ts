import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addRevoluteJointComponent,
  CircleShape,
  PhysicsBodyId,
  PolygonShape,
  RevoluteJoint,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import {
  Color,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

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

const brickSize = floorTileSize;
const brickCount = 5;
const towerColumns = 3;

// Every entity's spawn position below is an absolute world-space
// coordinate, authored directly rather than computed from another
// entity's position (e.g. the floor is not derived from the ball's rest
// position). The one exception is the joint's `anchorB`, which the
// RevoluteJoint API requires as an offset local to the ball, computed once
// from `pivotPosition` and `ballStartPosition` (see `createWreckingBall`).
const pivotPosition = new Vector2(-260, 260);
const ballStartPosition = new Vector2(-480, 150);
// The center of the floor's middle tile. Its height was chosen so the
// floor's top surface stays below the ball's swing everywhere the floor
// spans, while the brick tower standing on it rises back up into the
// ball's path, see the comment on `floorTileCount` uses in
// `createWreckingBall`.
const floorPosition = new Vector2(-100, -107);

const craneColor = Color.fromHSLA(215, 25, 45);
const ballColor = Color.white;
const floorColor = Color.fromHSLA(30, 30, 32);
const brickColors = [Color.white, Color.green];

interface WreckingBallSprites {
  ball: SpriteEcsComponent;
  brick: SpriteEcsComponent;
}

async function loadWreckingBallSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<WreckingBallSprites> {
  const { imageCache } = renderContext;

  const [ballImage, brickImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
  ]);

  return {
    ball: createImageSprite(ballImage, renderContext, renderLayer),
    brick: createImageSprite(brickImage, renderContext, renderLayer),
  };
}

/**
 * Creates a single entity carrying both the sprite and the `RigidBody`
 * that represents it, positioned wherever `physicsBody` was constructed at.
 * Every object in this scene is one entity, not a visual entity paired with
 * a separate physics entity.
 * @param world - The ECS world to add the entity to.
 * @param sprite - The sprite to render.
 * @param color - The tint applied to `sprite`.
 * @param physicsBody - The body backing this entity, already positioned.
 * @param scale - The sprite's scale. Omit to render `sprite` at its native
 * pixel size (the default for every object in this scene except the wall
 * bricks, which are deliberately smaller than their sprite's native size).
 */
function createPhysicsSpriteEntity(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  color: Color,
  physicsBody: RigidBody,
  scale?: Vector2,
): void {
  const entity = world.createEntity();
  const { position, angle } = physicsBody;

  world.addComponent(entity, positionId, {
    world: position.clone(),
    local: position.clone(),
  });
  world.addComponent(entity, rotationId, { local: angle, world: angle });

  if (scale) {
    world.addComponent(entity, scaleId, { local: scale, world: scale });
  }

  world.addComponent(entity, spriteId, { ...sprite, tintColor: color });
  world.addComponent(entity, PhysicsBodyId, { physicsBody });
}

function createFloor(world: EcsWorld, sprite: SpriteEcsComponent): void {
  const firstTileX =
    floorPosition.x - (floorTileSize * (floorTileCount - 1)) / 2;

  for (let i = 0; i < floorTileCount; i++) {
    const position = new Vector2(
      firstTileX + i * floorTileSize,
      floorPosition.y,
    );
    const floorBody = new RigidBody({
      shape: PolygonShape.rectangle(floorTileSize, floorTileSize),
      position,
      isStatic: true,
    });

    createPhysicsSpriteEntity(world, sprite, floorColor, floorBody);
  }
}

function createBrickTower(world: EcsWorld, sprite: SpriteEcsComponent): void {
  const towerBottomY = floorPosition.y + floorTileSize / 2;
  const firstColumnX = floorPosition.x - (brickSize * (towerColumns - 1)) / 2;
  // The bricks are explicitly half the size of their sprite's native 64x64
  // pixels, so (unlike every other object in this scene) they need a scale
  // to match their physics shape rather than rendering at native size.
  const brickScale = new Vector2(
    brickSize / sprite.width,
    brickSize / sprite.height,
  );

  for (let row = 0; row < brickCount; row++) {
    const y = towerBottomY + brickSize / 2 + row * brickSize;
    const color = brickColors[row % brickColors.length];

    for (let column = 0; column < towerColumns; column++) {
      const position = new Vector2(firstColumnX + column * brickSize, y);
      const brickBody = new RigidBody({
        shape: PolygonShape.rectangle(brickSize, brickSize),
        position,
        friction: 0.6,
        density: 0.01,
      });

      createPhysicsSpriteEntity(world, sprite, color, brickBody, brickScale);
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

  const pivotBody = new RigidBody({
    shape: new CircleShape(pivotRadius),
    position: pivotPosition.clone(),
    isStatic: true,
    isSensor: true,
  });

  createPhysicsSpriteEntity(world, sprites.brick, craneColor, pivotBody);
  createFloor(world, sprites.brick);
  createBrickTower(world, sprites.brick);

  const ballBody = new RigidBody({
    shape: new CircleShape(ballRadius),
    position: ballStartPosition.clone(),
    density: 4,
    restitution: 0.1,
  });

  createPhysicsSpriteEntity(world, sprites.ball, ballColor, ballBody);

  // `anchorB` is a local-space offset, not a world position: the ball
  // starts unrotated (angle 0), so its local frame matches world space at
  // construction, and the offset from the ball's center to the pivot is
  // just their absolute positions subtracted.
  const joint = new RevoluteJoint({
    bodyA: pivotBody,
    bodyB: ballBody,
    anchorB: pivotPosition.subtract(ballStartPosition),
  });

  const jointEntity = world.createEntity();

  addRevoluteJointComponent(world, jointEntity, { joint });
}
