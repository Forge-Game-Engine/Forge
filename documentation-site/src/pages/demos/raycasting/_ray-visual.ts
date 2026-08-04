import {
  addPositionComponent,
  addRotationComponent,
  PositionEcsComponent,
  RotationEcsComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addSpriteComponent,
  Color,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const lineWidth = 6;
const markerSize = 24;
const hitColor = Color.red;
const missColor = Color.white;

/**
 * The line and marker entities' live components used to visualize a ray:
 * a stretched/rotated sprite standing in for the ray itself (the engine has
 * no built-in "line between two points" primitive - see
 * `linear-spring-damper`'s `_spring-line` demo files for the same trick,
 * generalized here to an arbitrary angle instead of always-vertical), and a
 * small circle marking where it hit, hidden until the first hit.
 */
export interface RayVisual {
  line: {
    position: PositionEcsComponent;
    rotation: RotationEcsComponent;
    sprite: SpriteEcsComponent;
  };
  marker: {
    position: PositionEcsComponent;
    sprite: SpriteEcsComponent;
  };
}

/**
 * Creates the entities backing a {@link RayVisual}.
 * @param world - The ECS world to add the visual's entities to.
 * @param renderContext - The render context used to load the line/marker sprites.
 * @param renderLayer - The render layer the visual should be drawn on.
 */
export async function createRayVisual(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<RayVisual> {
  const { imageCache } = renderContext;

  const [lineImage, markerImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/White.png')),
    imageCache.getOrLoad(getAssetUrl('img/blue-circle.png')),
  ]);

  const lineSprite = createImageSprite(lineImage, renderContext, renderLayer);
  const markerSprite = createImageSprite(
    markerImage,
    renderContext,
    renderLayer,
  );

  const lineEntity = world.createEntity();
  const linePosition = addPositionComponent(world, lineEntity);
  const lineRotation = addRotationComponent(world, lineEntity);
  const lineSpriteComponent = addSpriteComponent(world, lineEntity, {
    ...lineSprite,
    width: lineWidth,
    height: 1,
    tintColor: missColor,
  });

  const markerEntity = world.createEntity();
  const markerPosition = addPositionComponent(world, markerEntity);
  const markerSpriteComponent = addSpriteComponent(world, markerEntity, {
    ...markerSprite,
    width: markerSize,
    height: markerSize,
    tintColor: hitColor,
    enabled: false,
  });

  return {
    line: {
      position: linePosition,
      rotation: lineRotation,
      sprite: lineSpriteComponent,
    },
    marker: { position: markerPosition, sprite: markerSpriteComponent },
  };
}

/**
 * Repositions, resizes, and rotates the ray line to span `start` to `end`,
 * and shows/repositions (or hides) the hit marker at `hitPoint`.
 * @param ray - The visual's live components, from {@link createRayVisual}.
 * @param start - The ray's world-space start point.
 * @param end - The ray's world-space end point: the raycast hit point if it
 * hit something, otherwise the ray's maximum extent.
 * @param hitPoint - The world-space point the ray hit, or `null` if it hit
 * nothing.
 */
export function updateRayVisual(
  ray: RayVisual,
  start: Vector2,
  end: Vector2,
  hitPoint: Vector2 | null,
): void {
  // Clone before subtracting/adding: `start`/`end` are the caller's own ray
  // points, so this must not mutate them.
  const direction = Vec2.subtract(Vec2.clone(end), start);
  const length = Vec2.magnitude(direction);
  const midpoint = Vec2.multiply(Vec2.add(Vec2.clone(start), end), 0.5);

  // The line sprite's unrotated "long axis" is local +y (see
  // `createRayVisual`'s `height`/`width`), so this finds the angle that
  // rotates (0, 1) onto `direction`.
  const angle = Math.atan2(-direction.x, direction.y);

  ray.line.position.world = midpoint;
  ray.line.position.local = Vec2.clone(midpoint);
  ray.line.rotation.world = angle;
  ray.line.rotation.local = angle;
  ray.line.sprite.height = length;
  ray.line.sprite.tintColor = hitPoint ? hitColor : missColor;

  ray.marker.sprite.enabled = hitPoint !== null;

  if (hitPoint) {
    ray.marker.position.world = Vec2.clone(hitPoint);
    ray.marker.position.local = Vec2.clone(hitPoint);
  }
}
