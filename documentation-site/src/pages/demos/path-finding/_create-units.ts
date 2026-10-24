import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addNavigationAgentComponent,
  PathPlanner,
} from '@forge-game-engine/forge/navigation';
import {
  addColliderComponent,
  addRigidBodyComponent,
  CircleCollider,
} from '@forge-game-engine/forge/physics';
import {
  addDrawOrderComponent,
  addSpriteComponent,
  Color,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addUnitPathLinesComponent } from './_unit-path-lines.component';

/** The radius of a unit's body, in world units. */
export const unitRadius = 8;

const unitColors = [
  new Color(1, 0.75, 0.25, 1),
  new Color(0.4, 0.85, 1, 1),
  new Color(0.55, 1, 0.5, 1),
  new Color(1, 0.5, 0.8, 1),
  new Color(0.75, 0.6, 1, 1),
  new Color(1, 0.55, 0.4, 1),
  new Color(0.4, 1, 0.85, 1),
  new Color(1, 1, 0.55, 1),
];

/**
 * Creates the units in a block in the level's top-left room. Each has a
 * circle sprite, a circle collider, a dynamic rigid body, and a navigation
 * agent that plans with the shared planner.
 * @param world - The world to create the units in.
 * @param renderContext - The render context the circle texture is loaded
 * into.
 * @param planner - The planner every unit's agent plans its paths with.
 * @returns The units' entities.
 */
export async function createUnits(
  world: EcsWorld,
  renderContext: RenderContext,
  planner: PathPlanner,
): Promise<number[]> {
  const circleTexture = await renderContext.textureCache.getOrLoad(
    getAssetUrl('img/White_Circle.png'),
  );
  const sprite = createImageSprite(circleTexture, { pixelsPerUnit: 1 });
  const units: number[] = [];

  for (const [i, color] of unitColors.entries()) {
    const unit = world.createEntity();

    addPositionComponent(world, unit, {
      local: { x: -360 + (i % 4) * 28, y: -190 + Math.floor(i / 4) * 28 },
    });
    addRotationComponent(world, unit);
    addSpriteComponent(world, unit, {
      ...sprite,
      width: unitRadius * 2,
      height: unitRadius * 2,
      tintColor: color,
    });
    // Over the path lines, which are created later.
    addDrawOrderComponent(world, unit, { order: 1 });
    addColliderComponent(world, unit, {
      collider: new CircleCollider(unitRadius),
      // Without friction a unit slides along a wall or another unit it
      // bumps into, instead of sticking to it.
      friction: 0,
      restitution: 0,
    });
    addRigidBodyComponent(world, unit, { fixedRotation: true });
    addNavigationAgentComponent(world, unit, {
      planner,
      speed: 140,
      // Turns a little before each corner, and slows down over the last
      // 12 units of its path.
      arrivalRadius: 12,
    });
    addUnitPathLinesComponent(world, unit, color);
    units.push(unit);
  }

  return units;
}
