import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import {
  CircleShape,
  PhysicsBodyId,
  PolygonShape,
  RigidBody,
  Shape,
} from '@forge-game-engine/forge/physics';
import {
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { wallThickness } from './_create-boundaries';

const shapeCount = 1_000;
const minSize = 30;
const maxSize = 60;

/**
 * `block_corner_large.png` is a right triangle with its right angle at the
 * bottom-left of the image. PolygonShape re-centers vertices around their
 * centroid (a third of the way across, two thirds of the way down), so the
 * sprite's pivot is moved to match - keeping the rendered triangle aligned
 * with its physics shape as it rotates.
 */
const trianglePivot = new Vector2(1 / 3, 2 / 3);

/**
 * Creates a right-triangle shape matching the visual shape of
 * `block_corner_large.png`: right angle at the bottom-left, hypotenuse from
 * top-left to bottom-right.
 * @param width - The width of the triangle's bounding box.
 * @param height - The height of the triangle's bounding box.
 * @returns A new PolygonShape representing the triangle.
 */
function createTriangleShape(width: number, height: number): PolygonShape {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonShape([
    new Vector2(-halfWidth, halfHeight),
    new Vector2(-halfWidth, -halfHeight),
    new Vector2(halfWidth, -halfHeight),
  ]);
}

/**
 * Spawns a pile of dynamic circle, square, triangle and plank bodies above
 * the visible area, which then fall, bounce and rest under gravity.
 * @param world - The ECS world to add the shape entities to.
 * @param renderContext - The render context used to load the shape sprites.
 * @param renderLayer - The render layer the shapes should be drawn on.
 */
export async function spawnShapes(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const { imageCache } = renderContext;

  const [ballImage, squareImage, triangleImage, narrowImage] =
    await Promise.all([
      imageCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
      imageCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
      imageCache.getOrLoad(getAssetUrl('img/physics/block_corner_large.png')),
      imageCache.getOrLoad(getAssetUrl('img/physics/block_narrow.png')),
    ]);

  const ballSprite = createImageSprite(ballImage, renderContext, renderLayer);
  const squareSprite = createImageSprite(
    squareImage,
    renderContext,
    renderLayer,
  );
  const triangleSprite = createImageSprite(
    triangleImage,
    renderContext,
    renderLayer,
  );
  const narrowSprite = createImageSprite(
    narrowImage,
    renderContext,
    renderLayer,
  );

  triangleSprite.pivot = trianglePivot.clone();

  // One spawner per shape: pairs the sprite to render with the physics shape
  // to simulate, both sized relative to the sprite's height.
  const shapeSpawners: ((size: number) => {
    sprite: SpriteEcsComponent;
    shape: Shape;
  })[] = [
    (size) => ({ sprite: ballSprite, shape: new CircleShape(size / 2) }),
    (size) => ({
      sprite: squareSprite,
      shape: PolygonShape.rectangle(size, size),
    }),
    (size) => ({
      sprite: triangleSprite,
      shape: createTriangleShape(size, size),
    }),
    (size) => ({
      sprite: narrowSprite,
      shape: PolygonShape.rectangle(size / 4, size),
    }),
  ];

  const random = new Random();

  const { width, height } = renderContext.canvas;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const spawnShape = (
    sprite: SpriteEcsComponent,
    shape: Shape,
    position: Vector2,
    size: number,
  ): void => {
    const entity = world.createEntity();
    const scale = size / sprite.height;

    world.addComponent(entity, positionId, {
      world: position.clone(),
      local: position.clone(),
    });

    world.addComponent(entity, rotationId, { local: 0, world: 0 });

    world.addComponent(entity, scaleId, {
      local: new Vector2(scale, scale),
      world: new Vector2(scale, scale),
    });

    world.addComponent(entity, spriteId, sprite);

    world.addComponent(entity, PhysicsBodyId, {
      physicsBody: new RigidBody({
        shape,
        position: position.clone(),
        restitution: 0.6,
        friction: 0.4,
      }),
    });
  };

  for (let i = 0; i < shapeCount; i++) {
    const size = random.randomFloat(minSize, maxSize);
    const halfSize = size / 2;

    const position = new Vector2(
      random.randomFloat(
        -halfWidth + wallThickness + halfSize,
        halfWidth - wallThickness - halfSize,
      ),
      random.randomFloat(0, halfHeight * 4 - halfSize),
    );

    const spawner =
      shapeSpawners[random.randomInt(0, shapeSpawners.length - 1)];
    const { sprite, shape } = spawner(size);

    spawnShape(sprite, shape, position, size);
  }
}
