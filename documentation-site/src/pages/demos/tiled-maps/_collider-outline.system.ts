import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { ChainCollider, colliderId } from '@forge-game-engine/forge/physics';
import {
  addMeshComponent,
  buildRibbonMesh,
  Color,
  createRibbonMeshBuffers,
  Geometry,
  meshId,
  RenderContext,
  RibbonPoint,
} from '@forge-game-engine/forge/rendering';
import {
  ColliderOutlineEcsComponent,
  colliderOutlineId,
} from './_collider-outline.component';

const lineWidth = 2;
const lineColor = new Color(1, 0.35, 0.75, 1);

/**
 * Builds a closed loop as a ribbon along its edges. The ribbon runs past the
 * first point to the second again, so the corner where the loop closes is
 * mitered like every other corner.
 */
function createLoopGeometry(
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
      width: lineWidth,
      color: lineColor,
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

/** Removes the outline's line entities and disposes their geometries. */
function removeLines(world: EcsWorld, entity: number): void {
  for (const line of [...world.getChildren(entity)]) {
    world.getComponent(line, meshId)?.geometry.dispose();
    world.removeEntity(line);
  }
}

/**
 * Creates the system that draws `ChainCollider`s as lines. When a target's
 * collider isn't the one its outline was built from, as on the tick the
 * tilemap collider system rebuilds a layer's collider, it replaces the
 * lines with one per loop of the new collider.
 *
 * Register it after `createTilemapColliderEcsSystem`, so the lines show the
 * collider of the tick they're drawn on.
 * @param renderContext - The render context to build the lines' geometry in.
 * @returns The ECS system.
 */
export const createColliderOutlineEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[ColliderOutlineEcsComponent]> => ({
  query: [colliderOutlineId],
  update: (world, { entities, components: [outlines] }) => {
    for (let i = 0; i < entities.length; i++) {
      const outline = outlines[i];
      const collider = world.getComponent(outline.target, colliderId)?.collider;

      if (!collider || collider === outline.drawnCollider) {
        continue;
      }

      removeLines(world, entities[i]);
      outline.drawnCollider = collider;

      if (!(collider instanceof ChainCollider)) {
        continue;
      }

      for (const loop of collider.loops) {
        const line = world.createEntity();

        addPositionComponent(world, line);
        addMeshComponent(world, line, {
          geometry: createLoopGeometry(renderContext, loop),
          material: outline.material,
          layer: outline.layer,
        });
        world.setParent(line, entities[i]);
      }
    }
  },
});
