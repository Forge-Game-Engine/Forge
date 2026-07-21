import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  positionId,
  rotationId,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
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
import { wallThickness } from './_create-boundaries';

const groundColor = new Color(0.36, 0.62, 0.32, 1);
const hillAmplitude = 60;
const terrainDepth = 400;
const pointCount = 9;

/**
 * Builds a shared `Renderable` for terrain segment sprites: the standard
 * sprite vertex/fragment shaders, but sampling a 1x1 white texture instead
 * of an image, so each segment renders as a flat, tintable rectangle rather
 * than needing a ground image asset.
 * @param renderContext - The render context to build the material with.
 * @param layer - The render layer terrain segments should be drawn on.
 * @returns The shared terrain segment `Renderable`.
 */
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

/**
 * Creates a rolling-hill `TerrainShape` body spanning the play area,
 * replacing a flat floor, plus one sprite entity per terrain segment (a
 * thin rotated rectangle following the slope) to render it. Demonstrates
 * `TerrainShape` as described in the Terrain physics guide.
 * @param world - The ECS world to add the terrain entities to.
 * @param renderContext - The render context used to build the terrain sprite material.
 * @param renderLayer - The render layer the terrain should be drawn on.
 */
export function createTerrain(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): void {
  const renderable = createTerrainRenderable(renderContext, renderLayer);

  const { width, height } = renderContext.canvas;
  const halfHeight = height / 2;
  const terrainWidth = width - wallThickness * 2;
  const halfTerrainWidth = terrainWidth / 2;

  const points: Vector2[] = [];

  for (let i = 0; i < pointCount; i++) {
    const t = i / (pointCount - 1);
    const x = -halfTerrainWidth + t * terrainWidth;
    const y = -hillAmplitude * Math.sin(Math.PI * t);

    points.push(new Vector2(x, y));
  }

  const terrainShape = new TerrainShape(points, terrainDepth);

  // Rotated 180 degrees: `TerrainShape` always extends its solid slab
  // `depth` units in the +y direction from its surface points (in its own
  // local space), but this demo's gravity pulls bodies toward -y. Rotating
  // the body flips which world direction the slab extends in, so it faces
  // the right way for bodies falling under this demo's gravity.
  const angle = Math.PI;
  const position = new Vector2(0, -halfHeight + wallThickness / 2);

  const terrainBody = new RigidBody({
    shape: terrainShape,
    position,
    angle,
    isStatic: true,
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
}
