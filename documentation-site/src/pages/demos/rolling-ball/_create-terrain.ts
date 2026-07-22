import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { positionId, rotationId } from '@forge-game-engine/forge/common';
import { clamp, Random, Vector2 } from '@forge-game-engine/forge/math';
import {
  PhysicsBodyId,
  RigidBody,
  TerrainShape,
} from '@forge-game-engine/forge/physics';
import {
  Color,
  combineInstanceDataSegments,
  createQuadGeometry,
  getSharedBlackTexture,
  getSharedWhiteTexture,
  Material,
  Renderable,
  RenderContext,
  spriteId,
  spriteInstanceDataSegment,
} from '@forge-game-engine/forge/rendering';

const groundColor = new Color(0.36, 0.62, 0.32, 1);
const terrainDepth = 500;
const pointSpacing = 35;

// The width (in local x) of the flat platform centered on local x = 0 -
// where the ball spawns - before the terrain fades into its full
// rolling-hill height variation. Landing on a flat platform first, rather
// than a slope, makes the starting point read clearly as "home base", and
// centering it (rather than putting it at one end) means both roll
// directions lead into the same amount of varied terrain.
const flatStartZone = 700;

/**
 * A few sine waves at different amplitudes/frequencies/phases, summed
 * together, produce smooth, varied "rolling hills" terrain rather than
 * either a single uniform wave or jagged point-to-point noise (which would
 * create slopes too steep for the ball to roll over predictably). Fixed via
 * a seeded `Random`, so the terrain is identical on every page load - handy
 * for a demo where players compare notes on the same course.
 */
const hillLayers = (() => {
  const random = new Random('rolling-ball-terrain');

  return [1, 2, 3].map((octave) => ({
    amplitude: random.randomFloat(25, 70) / octave,
    frequency: random.randomFloat(0.0006, 0.0016) * octave,
    phase: random.randomFloat(0, Math.PI * 2),
  }));
})();

function heightAt(localX: number, halfWidth: number): number {
  const rawHeight = hillLayers.reduce(
    (sum, layer) =>
      sum + layer.amplitude * Math.sin(layer.frequency * localX + layer.phase),
    0,
  );

  const fade = clamp(
    (Math.abs(localX) - flatStartZone / 2) / flatStartZone,
    0,
    1,
  );

  return rawHeight * fade;
}

function createTerrainRenderable(
  renderContext: RenderContext,
  layer: number,
): Renderable {
  const { shaderCache, gl } = renderContext;

  const material = new Material(
    shaderCache.getShader('sprite.vert'),
    shaderCache.getShader('sprite.frag'),
    gl,
  );

  material.setUniform('u_texture', getSharedWhiteTexture(gl));
  material.setUniform('u_emissiveTexture', getSharedBlackTexture(gl));
  material.setColorUniform('u_emissiveColor', Color.white);
  material.setUniform('u_emissiveIntensity', 0);

  const { floatsPerInstance, bindInstanceData, setupInstanceAttributes } =
    combineInstanceDataSegments(spriteInstanceDataSegment);

  return new Renderable(
    createQuadGeometry(gl),
    material,
    floatsPerInstance,
    layer,
    bindInstanceData,
    setupInstanceAttributes,
  );
}

export interface RollingBallTerrain {
  /** The terrain's static `RigidBody`, for reference (e.g. grounded checks). */
  body: RigidBody;

  /**
   * The world-space x coordinate of the flat platform the ball spawns on,
   * near the start of the terrain.
   */
  spawnX: number;

  /**
   * Returns the world-space y coordinate of the terrain's surface at a
   * given world-space x. Used to place the ball (and anything else) exactly
   * on the ground, accounting for the terrain body's rotation (see below).
   */
  worldSurfaceYAt: (worldX: number) => number;
}

/**
 * Creates a long, varied-height `TerrainShape` ground body spanning
 * `totalWidth`, plus one sprite entity per terrain segment to render it.
 * @param world - The ECS world to add the terrain entities to.
 * @param renderContext - The render context used to build the terrain sprite material.
 * @param renderLayer - The render layer the terrain should be drawn on.
 * @param totalWidth - The total width of the terrain, in world units.
 */
export function createTerrain(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  totalWidth: number,
): RollingBallTerrain {
  const renderable = createTerrainRenderable(renderContext, renderLayer);
  const halfWidth = totalWidth / 2;

  const points: Vector2[] = [];

  for (let localX = -halfWidth; localX < halfWidth; localX += pointSpacing) {
    points.push(new Vector2(localX, heightAt(localX, halfWidth)));
  }

  points.push(new Vector2(halfWidth, heightAt(halfWidth, halfWidth)));

  const terrainShape = new TerrainShape(points, terrainDepth);

  // Rotated 180 degrees, same as the Physics demo's terrain: `TerrainShape`
  // always extends its solid slab `depth` units in the +y direction from
  // its surface points (in its own local space), but this demo's gravity
  // pulls bodies toward -y, so the body is flipped to face the right way.
  const angle = Math.PI;
  const position = Vector2.zero;

  const terrainBody = new RigidBody({
    shape: terrainShape,
    position,
    angle,
    isStatic: true,
    friction: 0.9,
  });

  const terrainEntity = world.createEntity();

  world.addComponent(terrainEntity, positionId, {
    world: position.clone(),
    local: position.clone(),
  });

  // `RotationEcsComponent.world` is negated relative to `RigidBody.angle`
  // (see the "Coordinate spaces" note in the Bodies and Shapes guide), the
  // same convention `createPhysicsSyncEcsSystem` uses for every other
  // static body.
  world.addComponent(terrainEntity, rotationId, {
    local: -angle,
    world: -angle,
  });

  world.addComponent(terrainEntity, PhysicsBodyId, {
    physicsBody: terrainBody,
  });

  for (let i = 0; i < points.length - 1; i++) {
    const surfaceLeft = points[i];
    const surfaceRight = points[i + 1];
    const edge = surfaceRight.subtract(surfaceLeft);
    const segmentWidth = edge.magnitude();

    // The outward normal (away from the solid slab) in the terrain's local
    // space; the segment sprite is centered `terrainDepth / 2` units in the
    // opposite direction so it spans from the surface down into the ground.
    const outwardNormal = edge.perpendicular().normalize();
    const localMidpoint = surfaceLeft
      .add(surfaceRight)
      .multiply(0.5)
      .subtract(outwardNormal.multiply(terrainDepth / 2));

    const segmentPosition = localMidpoint.rotate(angle).add(position);
    const segmentAngle = Math.atan2(edge.y, edge.x) + angle;

    const segmentEntity = world.createEntity();

    world.addComponent(segmentEntity, positionId, {
      world: segmentPosition,
      local: segmentPosition.clone(),
    });

    world.addComponent(segmentEntity, rotationId, {
      local: -segmentAngle,
      world: -segmentAngle,
    });

    world.addComponent(segmentEntity, spriteId, {
      width: segmentWidth,
      height: terrainDepth,
      pivot: new Vector2(0.5, 0.5),
      tintColor: groundColor,
      renderable,
      uvOffset: Vector2.zero,
      uvScale: Vector2.one,
      enabled: true,
      layer: renderLayer,
    });
  }

  // The flat platform is centered on local x = 0, which - since the 180
  // degree rotation maps worldX = position.x - localX - is also world x = 0
  // (position.x is Vector2.zero), so both roll directions lead into equal
  // amounts of hilly terrain.
  const spawnX = position.x;

  const worldSurfaceYAt = (worldX: number): number => {
    const localX = position.x - worldX;

    return position.y - heightAt(localX, halfWidth);
  };

  return { body: terrainBody, spawnX, worldSurfaceYAt };
}
