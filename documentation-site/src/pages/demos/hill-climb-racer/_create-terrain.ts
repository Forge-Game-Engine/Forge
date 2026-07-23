import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import {
  PhysicsBodyId,
  PolygonShape,
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

// Deliberately thinner than the wheels (`wheelRadius * 2` in
// `_create-car.ts`), so a wheel usually rests on two or three columns at
// once rather than one - that's fine functionally (see
// `AirControlEcsComponent`'s ground-contact *count*, not a single flag, for
// exactly this reason), and reads visually as finer-grained terrain instead
// of a coarse staircase. `columnDepth` just needs to be deep enough that a
// column's bottom edge is always well below any neighboring column's top
// (see `heightAt` for how small those height differences are kept), so
// there's no gap for a wheel to catch on at a step.
const columnWidth = 60;
const columnDepth = 500;
const groundColor = Color.fromHSLA(95, 45, 30);

/**
 * How far the flat launch pad the car spawns on extends before the terrain
 * starts climbing, in world units.
 */
const flatStartLength = 400;

/**
 * Total horizontal distance the generated course covers, including the
 * flat launch pad.
 */
const courseLength = 20000;

/**
 * How far past `flatStartLength` the hills take to ramp up to full
 * amplitude. Without this, `rollingHills`/`climb`/`noise` would switch on
 * abruptly at `flatStartLength`, and since their slope there is nonzero,
 * that would make the very first column a tall step (a car arriving at
 * speed slams into it rather than climbing it). Smoothstep ramps
 * `rollingHills`/`climb`/`noise` in with a slope of zero at
 * `flatStartLength`, so the ground eases out of the flat pad instead of
 * kinking.
 */
const hillRampLength = 400;

/**
 * Computes the ground height at `x`: flat for `flatStartLength`, then a mix
 * of two sine waves at different frequencies (rolling hills), a slow upward
 * trend (so the course is a net "climb" rather than just undulating), and
 * small per-column noise so it doesn't read as perfectly periodic - all
 * ramped in smoothly over `hillRampLength` so the transition out of the
 * flat pad has no sudden change in slope. The amplitudes here are
 * deliberately gentle relative to `columnWidth`: since the terrain is built
 * from flat, unrotated columns (see `createGroundColumn`), a large height
 * change between adjacent columns reads as a hard step to drive over
 * rather than a slope, so keeping consecutive columns close in height
 * keeps the course feeling like rolling hills rather than a staircase.
 * @param x - The world-space x coordinate to sample.
 * @param random - The seeded random source used for per-column noise.
 */
function heightAt(x: number, random: Random): number {
  if (x <= flatStartLength) {
    return 0;
  }

  const distanceIntoHills = x - flatStartLength;

  const rollingHills =
    Math.sin(distanceIntoHills * 0.0012) * 90 +
    Math.sin(distanceIntoHills * 0.0035 + 1.7) * 40;
  const climb = distanceIntoHills * 0.04;
  const noise = random.randomFloat(-3, 3);

  const rampT = Math.min(distanceIntoHills / hillRampLength, 1);
  const ramp = rampT * rampT * (3 - 2 * rampT);

  return (rollingHills + climb + noise) * ramp;
}

/**
 * Creates one static ground column spanning `left` to `right`: a flat,
 * unrotated rectangle topped at `height` and extending `columnDepth` below
 * it, so consecutive columns (each independently topped at their own
 * sampled height) form a gently stepped profile rather than a smoothly
 * angled one.
 * @param world - The ECS world to add the column entity to.
 * @param groundSprite - The pre-loaded, unscaled ground sprite shared by
 * every column.
 * @param left - The world-space x coordinate of the column's left edge.
 * @param right - The world-space x coordinate of the column's right edge.
 * @param height - The world-space y coordinate of the column's top edge.
 */
function createGroundColumn(
  world: EcsWorld,
  groundSprite: SpriteEcsComponent,
  left: number,
  right: number,
  height: number,
): void {
  const width = right - left;

  if (width <= 0) {
    return;
  }

  const position = new Vector2(left + width / 2, height - columnDepth / 2);

  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    world: position.clone(),
    local: position.clone(),
  });
  world.addComponent(entity, rotationId, { local: 0, world: 0 });
  world.addComponent(entity, scaleId, {
    local: new Vector2(
      width / groundSprite.width,
      columnDepth / groundSprite.height,
    ),
    world: new Vector2(
      width / groundSprite.width,
      columnDepth / groundSprite.height,
    ),
  });
  world.addComponent(entity, spriteId, {
    ...groundSprite,
    tintColor: groundColor,
  });
  world.addComponent(entity, PhysicsBodyId, {
    physicsBody: new RigidBody({
      shape: PolygonShape.rectangle(width, columnDepth),
      position,
      isStatic: true,
      friction: 1,
    }),
  });
}

/**
 * Builds the course's terrain: a row of static, unrotated ground columns
 * following a procedurally generated height profile, starting with a flat
 * launch pad and climbing into gently rolling hills.
 * @param world - The ECS world to add the terrain entities to.
 * @param renderContext - The render context used to load the ground sprite.
 * @param renderLayer - The render layer the terrain should be drawn on.
 * @param random - The seeded random source used to vary the terrain.
 * @returns A point on the flat launch pad, suitable for spawning the car
 * above.
 */
export async function createTerrain(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  random: Random,
): Promise<Vector2> {
  const groundImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/physics/block_square.png'),
  );
  const groundSprite = createImageSprite(
    groundImage,
    renderContext,
    renderLayer,
  );

  // Phased so a column boundary lands exactly on `carSpawnX`: the car's two
  // wheels straddle that point (see `_create-car.ts`'s `frontAnchor`/
  // `rearAnchor`), and starting a column boundary any closer to one wheel
  // than the other would have that wheel spawn straddling the seam between
  // two columns instead of resting near the middle of one - which, even
  // though both columns are level with each other here, is still prone to
  // the narrow-phase collision detector picking the shared vertex as the
  // contact feature and returning a slightly asymmetric normal right at
  // the moment the car first settles.
  const carSpawnX = 150;
  const gridStart =
    carSpawnX - columnWidth * Math.ceil((carSpawnX + 200) / columnWidth);

  for (let left = gridStart; left < courseLength; left += columnWidth) {
    const right = left + columnWidth;
    const height = heightAt(left + columnWidth / 2, random);

    createGroundColumn(world, groundSprite, left, right, height);
  }

  return new Vector2(carSpawnX, heightAt(carSpawnX, random));
}
