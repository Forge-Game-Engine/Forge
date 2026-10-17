import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  ChainCollider,
} from '@forge-game-engine/forge/physics';
import {
  addMeshComponent,
  addSpriteComponent,
  buildRibbonMesh,
  Color,
  createImageSprite,
  createMeshMaterial,
  createRibbonMeshBuffers,
  ForgeShaderSource,
  Geometry,
  RenderContext,
  RibbonPoint,
} from '@forge-game-engine/forge/rendering';
import { outlineFragmentShader, outlineVertexShader } from './_outline.shader';

/** The length of one floor tile, in world units. */
const tileSize = 40;

const outlineWidth = 4;
const outlineColor = new Color(0.75, 0.82, 0.95, 1);
const jointSize = 8;
const jointColor = new Color(1, 0.6, 0.2, 1);

/**
 * Points from `start` to `end`, one every `tileSize` units along x, the
 * way a tile layer's floor is split into one edge per tile.
 */
function tiledRun(startX: number, endX: number, y: number): Vector2[] {
  const points: Vector2[] = [];
  const step = Math.sign(endX - startX) * tileSize;

  for (let x = startX; x !== endX; x += step) {
    points.push({ x, y });
  }

  return points;
}

/**
 * The room: a hole in solid, so its points run counterclockwise on screen
 * (negative signed area) and every edge's normal points into the room.
 * Its floor is split into one edge per tile and rises up a slope to a
 * ledge on the right. With no loop around it, the solid around the room
 * has no outer edge.
 */
const room: Vector2[] = [
  { x: -420, y: -250 },
  ...tiledRun(-420, 100, 250),
  { x: 100, y: 250 },
  ...tiledRun(260, 420, 170),
  { x: 420, y: 170 },
  { x: 420, y: -250 },
];

/**
 * Solid loops inside the room: their points run clockwise on screen
 * (positive signed area), so every edge's normal points out of them.
 */
const platforms: Vector2[][] = [
  // A low platform on the left.
  [
    { x: -300, y: 80 },
    { x: -140, y: 80 },
    { x: -140, y: 100 },
    { x: -300, y: 100 },
  ],
  // An L-shaped shelf near the ceiling, with a concave corner on top.
  [
    { x: -100, y: -180 },
    { x: -80, y: -180 },
    { x: -80, y: -140 },
    { x: 60, y: -140 },
    { x: 60, y: -120 },
    { x: -100, y: -120 },
  ],
  // A thin wall, six units thick, that the fast ball is fired at.
  [
    { x: 180, y: -150 },
    { x: 186, y: -150 },
    { x: 186, y: 60 },
    { x: 180, y: 60 },
  ],
];

/** Every loop of the level, room first. */
export const levelLoops: Vector2[][] = [room, ...platforms];

/**
 * Draws a closed loop as a ribbon along its edges. The ribbon runs past the
 * first point to the second again, so the corner where the loop closes is
 * mitered like every other corner.
 */
function createOutlineGeometry(
  renderContext: RenderContext,
  loop: readonly Vector2[],
): Geometry {
  const path = [...loop, loop[0], loop[1]];
  const points: RibbonPoint[] = [];
  let distance = 0;

  for (let i = 0; i < path.length; i++) {
    if (i > 0) {
      distance += Math.hypot(
        path[i].x - path[i - 1].x,
        path[i].y - path[i - 1].y,
      );
    }

    points.push({
      position: path[i],
      width: outlineWidth,
      color: outlineColor,
      distance,
    });
  }

  const buffers = createRibbonMeshBuffers(points.length);
  const vertexCount = buildRibbonMesh(
    points,
    { textureMode: 'stretch', miterLimit: 4 },
    buffers,
  );
  const geometry = new Geometry(renderContext, {
    attributes: [
      { name: 'a_position', data: buffers.positions, size: 2 },
      { name: 'a_color', data: buffers.colors, size: 4 },
    ],
    topology: 'triangleStrip',
  });

  geometry.update({
    vertexCount,
    attributes: { a_position: buffers.positions, a_color: buffers.colors },
  });

  return geometry;
}

/**
 * Creates the level: one static entity whose `ChainCollider` holds every
 * loop, drawn as outlines built from the same points, with a dot at every
 * point so the edge joints the bodies slide across are visible.
 * @param world - The ECS world to add the level to.
 * @param renderContext - The render context to draw the level with.
 * @param renderLayer - The render category the camera draws.
 */
export function createLevel(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): void {
  const level = world.createEntity();

  // No rigid body: the level is static. Every loop is in this entity's
  // local space, which is world space at the origin.
  addPositionComponent(world, level);
  addColliderComponent(world, level, {
    collider: new ChainCollider(levelLoops),
    friction: 0.5,
    restitution: 0.1,
  });

  renderContext.shaderCache
    .addShader(new ForgeShaderSource(outlineVertexShader))
    .addShader(new ForgeShaderSource(outlineFragmentShader));

  const material = createMeshMaterial(
    renderContext,
    'chain-outline.vert',
    'chain-outline.frag',
  );

  for (const loop of levelLoops) {
    const outline = world.createEntity();

    addPositionComponent(world, outline);
    addMeshComponent(world, outline, {
      geometry: createOutlineGeometry(renderContext, loop),
      material,
      category: renderLayer,
    });
  }

  const jointSprite = {
    ...createImageSprite(renderContext.whiteTexture, {
      pixelsPerUnit: renderContext.whiteTexture.width / jointSize,
    }),
    tintColor: jointColor,
    category: renderLayer,
  };

  for (const point of levelLoops.flat()) {
    const joint = world.createEntity();

    addPositionComponent(world, joint, { local: { x: point.x, y: point.y } });
    addSpriteComponent(world, joint, jointSprite);
  }
}
