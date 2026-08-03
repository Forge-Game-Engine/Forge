import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import {
  createVector2,
  Random,
  Vector2,
  vector2Clone,
} from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  addGravityComponent,
  addRigidBodyComponent,
  CircleCollider,
  Collider,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  calculateVisibleWorldSize,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { wallThickness } from './_create-boundaries';

const shapeCount = 300;
const minSize = 30;
const maxSize = 60;
const gravity = createVector2(0, -300);

/**
 * `block_corner_large.png` is a right triangle with its right angle at the
 * bottom-left of the image. `PolygonCollider` re-centers vertices around
 * their centroid (a third of the way across, two thirds of the way down), so
 * the sprite's pivot is moved to match - keeping the rendered triangle
 * aligned with its physics shape as it rotates.
 */
const trianglePivot = createVector2(1 / 3, 2 / 3);

function rectangleVertices(width: number, height: number): Vector2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    createVector2(-halfWidth, -halfHeight),
    createVector2(halfWidth, -halfHeight),
    createVector2(halfWidth, halfHeight),
    createVector2(-halfWidth, halfHeight),
  ];
}

/**
 * Creates a right-triangle collider matching the visual shape of
 * `block_corner_large.png`: right angle at the bottom-left, hypotenuse from
 * top-left to bottom-right.
 * @param width - The width of the triangle's bounding box.
 * @param height - The height of the triangle's bounding box.
 * @returns A new PolygonCollider representing the triangle.
 */
function createTriangleCollider(width: number, height: number): Collider {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonCollider([
    createVector2(-halfWidth, halfHeight),
    createVector2(-halfWidth, -halfHeight),
    createVector2(halfWidth, -halfHeight),
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

  triangleSprite.pivot = vector2Clone(trianglePivot);

  // One spawner per shape: pairs the sprite to render with the physics
  // collider to simulate, both sized relative to the sprite's height.
  const shapeSpawners: ((size: number) => {
    sprite: SpriteEcsComponent;
    collider: Collider;
  })[] = [
    (size) => ({ sprite: ballSprite, collider: new CircleCollider(size / 2) }),
    (size) => ({
      sprite: squareSprite,
      collider: new PolygonCollider(rectangleVertices(size, size)),
    }),
    (size) => ({
      sprite: triangleSprite,
      collider: createTriangleCollider(size, size),
    }),
    (size) => ({
      sprite: narrowSprite,
      collider: new PolygonCollider(rectangleVertices(size / 4, size)),
    }),
  ];

  const random = new Random();

  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const spawnShape = (
    sprite: SpriteEcsComponent,
    collider: Collider,
    position: Vector2,
    size: number,
  ): void => {
    const entity = world.createEntity();
    const scale = size / sprite.height;

    addPositionComponent(world, entity, {
      world: vector2Clone(position),
      local: vector2Clone(position),
    });

    addRotationComponent(world, entity);

    addScaleComponent(world, entity, {
      local: createVector2(scale, scale),
      world: createVector2(scale, scale),
    });

    addSpriteComponent(world, entity, sprite);

    addColliderComponent(world, entity, {
      collider,
      restitution: 0.6,
      friction: 0.4,
    });
    addAabbComponent(world, entity);
    addRigidBodyComponent(world, entity, {
      mass: collider.mass,
      momentOfInertia: collider.momentOfInertia,
    });
    addGravityComponent(world, entity, { amount: gravity });
  };

  for (let i = 0; i < shapeCount; i++) {
    const size = random.randomFloat(minSize, maxSize);
    const halfSize = size / 2;

    const position = createVector2(
      random.randomFloat(
        -halfWidth + wallThickness + halfSize,
        halfWidth - wallThickness - halfSize,
      ),
      random.randomFloat(0, halfHeight * 4 - halfSize),
    );

    const spawner =
      shapeSpawners[random.randomInt(0, shapeSpawners.length - 1)];
    const { sprite, collider } = spawner(size);

    spawnShape(sprite, collider, position, size);
  }
}
