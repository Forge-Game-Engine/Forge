import { EcsWorld, createTagId } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  Color,
  createImageSprite,
  getCameraView,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';

/** Tags the shelf segment the trapdoor system removes. */
export const trapdoorId = createTagId('trapdoor');

const wallThickness = 40;
const shelfThickness = 20;

/** The world-space layout of the shelf the bodies rest on. */
export interface SleepingLevel {
  /** The Y of the shelf's top surface. */
  shelfTop: number;

  /** The X range of the trapdoor in the middle of the shelf. */
  trapdoorLeft: number;
  trapdoorRight: number;

  /** The X range between the side walls. */
  innerLeft: number;
  innerRight: number;
}

export function rectangleVertices(width: number, height: number): Vector2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ];
}

/**
 * Creates a static box: a collider with no rigid body, which never moves
 * and never joins an island.
 */
function createStaticBox(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  left: number,
  top: number,
  width: number,
  height: number,
): number {
  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    local: { x: left + width / 2, y: top + height / 2 },
  });
  addRotationComponent(world, entity);
  addSpriteComponent(world, entity, { ...sprite, width, height });
  addColliderComponent(world, entity, {
    collider: new PolygonCollider(rectangleVertices(width, height)),
  });

  return entity;
}

/**
 * Builds the static level: two side walls, a basin floor at the bottom of
 * the view, and a shelf across the middle made of three segments. The
 * middle segment is the trapdoor, tagged with `trapdoorId`.
 * @param world - The ECS world to add the level to.
 * @param camera - The camera whose visible area the level fills.
 * @param renderContext - The render context whose white texture the level is drawn with.
 * @param renderLayer - The render layer the level is drawn on.
 * @param trapdoorWidth - How wide the trapdoor is.
 * @returns Where the shelf and trapdoor are.
 */
export function createLevel(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
  renderLayer: number,
  trapdoorWidth: number,
): SleepingLevel {
  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const wallSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayer,
  };
  wallSprite.tintColor = new Color(0.55, 0.6, 0.7);

  const trapdoorSprite = { ...wallSprite };
  trapdoorSprite.tintColor = new Color(0.85, 0.55, 0.25);

  const innerLeft = -halfWidth + wallThickness;
  const innerRight = halfWidth - wallThickness;

  createStaticBox(
    world,
    wallSprite,
    -halfWidth,
    -halfHeight,
    wallThickness,
    height,
  );
  createStaticBox(
    world,
    wallSprite,
    innerRight,
    -halfHeight,
    wallThickness,
    height,
  );
  createStaticBox(
    world,
    wallSprite,
    innerLeft,
    halfHeight - wallThickness,
    innerRight - innerLeft,
    wallThickness,
  );

  // The shelf sits low enough to leave room above it for the pyramid, and
  // high enough to leave a basin below it for what falls through.
  const shelfTop = height * 0.12;
  const trapdoorLeft = -trapdoorWidth / 2;
  const trapdoorRight = trapdoorWidth / 2;

  createStaticBox(
    world,
    wallSprite,
    innerLeft,
    shelfTop,
    trapdoorLeft - innerLeft,
    shelfThickness,
  );
  createStaticBox(
    world,
    wallSprite,
    trapdoorRight,
    shelfTop,
    innerRight - trapdoorRight,
    shelfThickness,
  );

  const trapdoor = createStaticBox(
    world,
    trapdoorSprite,
    trapdoorLeft,
    shelfTop,
    trapdoorWidth,
    shelfThickness,
  );

  world.addTag(trapdoor, trapdoorId);

  return { shelfTop, trapdoorLeft, trapdoorRight, innerLeft, innerRight };
}
