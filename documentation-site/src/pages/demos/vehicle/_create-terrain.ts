import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  createTerrainBodies,
  PhysicsBodyId,
} from '@forge-game-engine/forge/physics';
import {
  Color,
  createImageSprite,
  RenderContext,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const segmentSpacing = 10;
// Thick relative to the wheels: a frame hitch (a slow asset decode, a GC
// pause) can produce one large deltaTimeInSeconds step, and a fast-moving
// body can tunnel through thin terrain within a single step. Generous
// thickness keeps that from punching all the way through into free fall.
//
// Exported since createTerrainBodies treats `points` as the ground's
// *centerline*, not its top surface: a caller that spawns something to
// rest on the ground needs to offset by half of this to land on the actual
// top surface rather than the centerline (or worse, embedded inside it).
export const terrainThickness = 60;
const terrainFriction = 1;
const groundColor = new Color(0.3, 0.6, 0.25);

/**
 * Options describing the shape of the generated course.
 */
export interface TerrainOptions {
  /**
   * How far the flat launch pad extends behind x=0, so a vehicle starting
   * near x=0 has solid ground under its full width rather than straddling
   * the course's start.
   */
  launchPad: number;
  /** The horizontal length of the course, in world units. */
  length: number;
  /** How flat the ground is before the climb begins. */
  flatStart: number;
  /** How much the course climbs per world unit traveled past `flatStart`. */
  slope: number;
  /** The height of the bumps layered on top of the climb. */
  bumpHeight: number;
  /** The horizontal distance between bumps. */
  bumpWavelength: number;
}

/**
 * Samples a bumpy, gradually climbing curve and hands it to
 * `createTerrainBodies` to build the ground, then creates one rendered
 * entity per generated segment sharing a single tinted sprite (matching the
 * physics demo's boundary walls, which also share one sprite across several
 * bodies).
 * @param world - The ECS world to add the terrain entities to.
 * @param renderContext - The render context used to load the ground sprite.
 * @param renderLayer - The render layer the terrain should be drawn on.
 * @param options - Options describing the shape of the course.
 * @returns The sampled points the terrain was generated from, so the caller
 * can position the vehicle relative to the ground height at a given x.
 */
export async function createTerrain(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  options: TerrainOptions,
): Promise<Vector2[]> {
  const { launchPad, length, flatStart, slope, bumpHeight, bumpWavelength } =
    options;

  const groundImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );
  const terrainSprite = createImageSprite(
    groundImage,
    renderContext,
    renderLayer,
  );

  terrainSprite.tintColor = groundColor;

  const points: Vector2[] = [];

  for (let x = -launchPad; x <= length; x += segmentSpacing) {
    const climbDistance = Math.max(0, x - flatStart);
    const height =
      x < 0
        ? 0
        : climbDistance * slope + Math.sin(x / bumpWavelength) * bumpHeight;

    points.push(new Vector2(x, height));
  }

  const segmentBodies = createTerrainBodies(points, {
    thickness: terrainThickness,
    friction: terrainFriction,
  });

  for (let i = 0; i < segmentBodies.length; i++) {
    const body = segmentBodies[i];
    const segmentLength = points[i + 1].subtract(points[i]).magnitude();
    const entity = world.createEntity();

    world.addComponent(entity, positionId, {
      world: body.position.clone(),
      local: body.position.clone(),
    });

    // `body.angle` is in physics world space (Y-up); `RotationEcsComponent`
    // is in render space (Y-down), so it's negated crossing that boundary,
    // the same convention `createPhysicsEcsSystem` uses for dynamic bodies.
    world.addComponent(entity, rotationId, {
      local: -body.angle,
      world: -body.angle,
    });

    world.addComponent(entity, scaleId, {
      local: new Vector2(
        segmentLength / terrainSprite.width,
        terrainThickness / terrainSprite.height,
      ),
      world: new Vector2(
        segmentLength / terrainSprite.width,
        terrainThickness / terrainSprite.height,
      ),
    });

    world.addComponent(entity, spriteId, terrainSprite);
    world.addComponent(entity, PhysicsBodyId, { physicsBody: body });
  }

  return points;
}
