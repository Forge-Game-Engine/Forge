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

// Kept comfortably larger than the wheels (`wheelRadius * 2` in
// `_create-car.ts`) so a wheel is normally in contact with just one ground
// segment at a time rather than straddling a seam between two, which is
// prone to catching on the small step where two independently-solved
// static bodies meet at even a slight angle. `segmentThickness` is
// similarly generous, so a fast-moving wheel has plenty of solid ground to
// push into rather than skimming close to a segment's edge.
const segmentSpacing = 150;
const segmentThickness = 250;
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
const courseLength = 6000;

/**
 * How far past `flatStartLength` the hills take to ramp up to full
 * amplitude. Without this, `rollingHills`/`climb`/`noise` would switch on
 * abruptly at `flatStartLength`, and since their slope there is nonzero,
 * that would make the very first hill segment a near-vertical wall (a car
 * arriving at speed slams into it rather than climbing it). Smoothstep
 * ramps `rollingHills`/`climb`/`noise` in with a slope of zero at
 * `flatStartLength`, so the ground bends smoothly out of the flat pad
 * instead of kinking.
 */
const hillRampLength = 400;

/**
 * Computes the ground height at `x`: flat for `flatStartLength`, then a mix
 * of two sine waves at different frequencies (rolling hills), a slow upward
 * trend (so the course is a net "climb" rather than just undulating), and
 * small per-point noise so it doesn't read as perfectly periodic - all
 * ramped in smoothly over `hillRampLength` so the transition out of the
 * flat pad has no sudden change in slope.
 * @param x - The world-space x coordinate to sample.
 * @param random - The seeded random source used for per-point noise.
 */
function heightAt(x: number, random: Random): number {
  if (x <= flatStartLength) {
    return 0;
  }

  const distanceIntoHills = x - flatStartLength;

  const rollingHills =
    Math.sin(distanceIntoHills * 0.0022) * 140 +
    Math.sin(distanceIntoHills * 0.006 + 1.7) * 60;
  const climb = distanceIntoHills * 0.12;
  const noise = random.randomFloat(-12, 12);

  const rampT = Math.min(distanceIntoHills / hillRampLength, 1);
  const ramp = rampT * rampT * (3 - 2 * rampT);

  return (rollingHills + climb + noise) * ramp;
}

/**
 * Creates one static ground segment spanning `from` to `to`: a rectangle
 * long enough to cover the distance between them, rotated to match the
 * slope, and shifted down along its own "up" normal by half its thickness.
 * That shift places the rectangle's *top* edge exactly on the line from
 * `from` to `to`, so consecutive segments (each anchored the same way to
 * their own shared endpoint) meet with no gap or step, however sharply the
 * slope changes from one segment to the next.
 * @param world - The ECS world to add the segment entity to.
 * @param groundSprite - The pre-loaded, unscaled ground sprite shared by
 * every segment.
 * @param from - The world-space top-left point of this segment.
 * @param to - The world-space top-right point of this segment.
 */
function createGroundSegment(
  world: EcsWorld,
  groundSprite: SpriteEcsComponent,
  from: Vector2,
  to: Vector2,
): void {
  const delta = to.subtract(from);
  const length = delta.magnitude();

  if (length === 0) {
    return;
  }

  const direction = delta.multiply(1 / length);
  const angle = Math.atan2(direction.y, direction.x);
  const up = direction.rotate(Math.PI / 2);
  const midpoint = from.add(to).multiply(0.5);
  const position = midpoint.subtract(up.multiply(segmentThickness / 2));

  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    world: position.clone(),
    local: position.clone(),
  });
  world.addComponent(entity, rotationId, { local: angle, world: angle });
  world.addComponent(entity, scaleId, {
    local: new Vector2(
      length / groundSprite.width,
      segmentThickness / groundSprite.height,
    ),
    world: new Vector2(
      length / groundSprite.width,
      segmentThickness / groundSprite.height,
    ),
  });
  world.addComponent(entity, spriteId, {
    ...groundSprite,
    tintColor: groundColor,
  });
  world.addComponent(entity, PhysicsBodyId, {
    physicsBody: new RigidBody({
      shape: PolygonShape.rectangle(length, segmentThickness),
      position,
      angle,
      isStatic: true,
      friction: 1,
    }),
  });
}

/**
 * Builds the course's terrain: a chain of static ground segments following
 * a procedurally generated height profile, starting with a flat launch pad
 * and climbing into rolling hills.
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

  const points: Vector2[] = [];

  for (let x = -200; x <= courseLength; x += segmentSpacing) {
    points.push(new Vector2(x, heightAt(x, random)));
  }

  for (let i = 0; i < points.length - 1; i++) {
    createGroundSegment(world, groundSprite, points[i], points[i + 1]);
  }

  return new Vector2(150, heightAt(150, random));
}
