import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { lerp, Vector2 } from '@forge-game-engine/forge/math';
import {
  addDrawOrderComponent,
  addMeshComponent,
  createMeshMaterial,
  DrawOrderEcsComponent,
  ForgeShaderSource,
  Geometry,
  MeshEcsComponent,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { exhaustFragmentShader, exhaustVertexShader } from './_exhaust.shader';

const segmentCount = 32;
const length = 260;
const startHalfWidth = 34;
const endHalfWidth = 6;
const waveAmplitude = 14;

/** The exhaust's color at the engine (`0`) and at its tip (`1`), RGBA. */
const startColor = [1, 0.95, 0.7, 0.95];
const endColor = [1, 0.25, 0.05, 0];

/** The parts of the exhaust the demo's settings change. */
export interface Exhaust {
  mesh: MeshEcsComponent;
  drawOrder: DrawOrderEcsComponent;
}

/**
 * Builds a tapering, wavy band as a triangle strip: two vertices (left and
 * right edge) per step down its length, each with a position and a color.
 * The vertices are in the entity's local space, starting at its origin and
 * running down -Y.
 */
function buildExhaustGeometry(renderContext: RenderContext): Geometry {
  const vertexCount = (segmentCount + 1) * 2;
  const positions = new Float32Array(vertexCount * 2);
  const colors = new Float32Array(vertexCount * 4);

  for (let i = 0; i <= segmentCount; i++) {
    const t = i / segmentCount;
    const halfWidth = lerp(startHalfWidth, endHalfWidth, t);
    const centerX = Math.sin(t * Math.PI * 3) * waveAmplitude * t;
    const y = -t * length;
    const color = startColor.map((start, c) => lerp(start, endColor[c], t));

    positions.set([centerX - halfWidth, y, centerX + halfWidth, y], i * 4);
    colors.set([...color, ...color], i * 8);
  }

  return new Geometry(renderContext, {
    attributes: [
      { name: 'a_position', data: positions, size: 2 },
      { name: 'a_color', data: colors, size: 4 },
    ],
    topology: 'triangleStrip',
  });
}

/**
 * Creates the ship's exhaust: an entity with a mesh, drawn by the render
 * system in the same draw order as the sprites around it, by its layer and
 * then its world order.
 * @param world - The ECS world to add the exhaust to.
 * @param renderContext - The render context to build the mesh with.
 * @param position - Where the exhaust starts, at the ship's engine.
 * @param category - The render category the camera draws.
 * @param order - The exhaust's starting world order.
 * @returns The exhaust's mesh and draw order, for the settings to change.
 */
export function createExhaust(
  world: EcsWorld,
  renderContext: RenderContext,
  position: Vector2,
  category: number,
  order: number,
): Exhaust {
  renderContext.shaderCache
    .addShader(new ForgeShaderSource(exhaustVertexShader))
    .addShader(new ForgeShaderSource(exhaustFragmentShader));

  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: position });

  const mesh = addMeshComponent(world, entity, {
    geometry: buildExhaustGeometry(renderContext),
    material: createMeshMaterial(renderContext, 'exhaust.vert', 'exhaust.frag'),
    category,
  });
  const drawOrder = addDrawOrderComponent(world, entity, { order });

  return { mesh, drawOrder };
}
