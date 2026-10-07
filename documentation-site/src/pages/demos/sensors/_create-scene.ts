import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  addContactsComponent,
  ColliderDefaultedOptions,
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
import { drainId } from './_drain.system';
import { addTriggerZoneComponent } from './_trigger-zone.component';

/**
 * Collision categories. Walls and ramps keep the default category and mask,
 * so they collide with everything. The zones and the drain only accept
 * balls, so the zone system never sees the walls the zones touch.
 */
export const ballCategory = 1 << 1;
const sensorCategory = 1 << 2;

const sensorOptions: Partial<ColliderDefaultedOptions> = {
  sensor: true,
  category: sensorCategory,
  mask: ballCategory,
};

const wallThickness = 40;
const zoneHeight = 70;

function rectangleVertices(width: number, height: number): Vector2[] {
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
 * Creates the scene's static colliders: solid side walls and ramps that
 * balls bounce off, two sensor trigger zones that balls fall straight
 * through, and a sensor drain below the bottom edge that removes them.
 * @param world - The ECS world to add the entities to.
 * @param camera - The camera whose view the scene fills.
 * @param renderContext - The render context used to load the sprites.
 * @param renderLayer - The render layer to draw the scene on.
 */
export async function createScene(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const whiteSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayer,
  };

  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const addBox = (
    position: Vector2,
    size: Vector2,
    rotation: number,
    sprite: Partial<SpriteEcsComponent> | null,
    colliderOptions: Partial<ColliderDefaultedOptions> = {},
  ): number => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: position });
    addRotationComponent(world, entity, { local: rotation });
    addColliderComponent(world, entity, {
      collider: new PolygonCollider(rectangleVertices(size.x, size.y)),
      ...colliderOptions,
    });

    if (sprite) {
      addSpriteComponent(world, entity, {
        ...whiteSprite,
        ...sprite,
        width: size.x,
        height: size.y,
      });
    }

    return entity;
  };

  const solid = { tintColor: new Color(0.55, 0.6, 0.7) };

  // Solid side walls and two ramps: balls collide with and bounce off these.
  addBox(
    { x: -halfWidth + wallThickness / 2, y: 0 },
    { x: wallThickness, y: height },
    0,
    solid,
  );
  addBox(
    { x: halfWidth - wallThickness / 2, y: 0 },
    { x: wallThickness, y: height },
    0,
    solid,
  );
  addBox(
    { x: -halfWidth * 0.35, y: halfHeight * 0.35 },
    { x: width * 0.45, y: 16 },
    -0.3,
    solid,
  );
  addBox(
    { x: halfWidth * 0.35, y: -halfHeight * 0.05 },
    { x: width * 0.45, y: 16 },
    0.3,
    solid,
  );

  // Two sensor trigger zones: detected, never resolved, so balls fall
  // straight through while the zone system tints them.
  const zones = [
    { y: -halfHeight * 0.35, color: new Color(1, 0.75, 0.2) },
    { y: -halfHeight * 0.7, color: new Color(0.3, 0.9, 0.5) },
  ];

  for (const zone of zones) {
    const entity = addBox(
      { x: 0, y: zone.y },
      { x: width - wallThickness * 2, y: zoneHeight },
      0,
      { tintColor: zone.color },
      sensorOptions,
    );

    addTriggerZoneComponent(world, entity, { color: zone.color });
    addContactsComponent(world, entity);
  }

  // A sensor drain just below the bottom edge removes every ball it touches.
  const drain = addBox(
    { x: 0, y: -halfHeight - 60 },
    { x: width * 2, y: 40 },
    0,
    null,
    sensorOptions,
  );

  world.addTag(drain, drainId);
  addContactsComponent(world, drain);
}
