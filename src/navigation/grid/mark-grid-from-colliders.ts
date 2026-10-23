import {
  PositionEcsComponent,
  positionId,
} from '../../common/components/position-component.js';
import {
  RotationEcsComponent,
  rotationId,
} from '../../common/components/rotation-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { getColliderRotation } from '../../physics/collider-rotation.js';
import {
  allCollisionCategories,
  ColliderEcsComponent,
  colliderId,
} from '../../physics/components/collider-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../../physics/components/rigidbody-component.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { createCellFrame } from './baking/cell-distance.js';
import { getColliderRegion } from './baking/collider-regions.js';
import { markRegion } from './baking/mark-region.js';
import { NavigationGrid } from './navigation-grid.js';

/** Options for {@link markGridFromColliders}. */
export interface MarkGridFromCollidersOptions {
  /**
   * How far, in world units, a cell must stay from every collider to
   * remain walkable: each shape is grown by this radius before marking, so
   * a unit of this radius standing in a walkable cell, or walking between
   * walkable cell centres, stays clear of every baked collider. A finite
   * number of `0` or more. Defaults to `0`.
   */
  agentRadius?: number;

  /**
   * The collision categories that block the grid: a collider is baked only
   * if its `category` shares a bit with this mask. Pass the mask of the
   * units that will walk the grid, so the grid blocks what they collide
   * with. Defaults to `allCollisionCategories`.
   */
  mask?: number;
}

const defaultMarkGridFromCollidersOptions = {
  agentRadius: 0,
  mask: allCollisionCategories,
};

/**
 * Blocks every cell of a navigation grid that a static collider overlaps,
 * grown by `agentRadius`.
 *
 * A collider counts when its entity has a `PositionEcsComponent`, has no
 * `RigidBodyEcsComponent` or a `'static'` one, isn't a sensor, and has a
 * `category` sharing a bit with `mask`. Its shape is placed where physics
 * places it, by `position.world` and `rotation.world` (unrotated without a
 * `RotationEcsComponent`); like physics, it ignores scale. Circles and
 * convex polygons block their area, a terrain its whole slab, and a chain
 * the solid its loops enclose, leaving its holes open.
 *
 * A cell is blocked when any part of its area, not only its centre, comes
 * within `agentRadius` of the shape, so a wall thinner than a cell still
 * blocks every cell it crosses. A shape that only touches a cell's edge or
 * corner doesn't block it, so a wall on cell boundaries blocks just the
 * cells it covers.
 *
 * It only ever blocks cells and never makes one walkable. It's a bake
 * step: run it when the level loads, after one `world.update()` has
 * placed the colliders, and again after the level changes, not every
 * frame. To re-bake, open the cells first with `grid.fillWalkable` and
 * bake again. `grid.version` increases once if any cell was blocked.
 * @param world - The world whose colliders to bake.
 * @param grid - The grid to mark.
 * @param options - The agent radius and category mask.
 * @throws An error if `agentRadius` isn't finite and `0` or more.
 */
export function markGridFromColliders(
  world: EcsWorld,
  grid: NavigationGrid,
  options?: MarkGridFromCollidersOptions,
): void {
  const { agentRadius, mask } = withDefaults(
    defaultMarkGridFromCollidersOptions,
    options,
  );

  if (!Number.isFinite(agentRadius) || agentRadius < 0) {
    throw new Error(
      `Unable to mark a navigation grid from colliders, agentRadius must be a finite number of 0 or more, received ${agentRadius}.`,
    );
  }

  const frame = createCellFrame(grid);
  const blocked = new Uint8Array(grid.nodeCount);

  // Seeded with the cells already blocked, so the passes skip them. Reading
  // them one cell at a time is fine for a bake, which runs when the level
  // changes, not every frame.
  for (let node = 0; node < grid.nodeCount; node++) {
    const { column, row } = grid.nodeToCell(node);

    if (!grid.isWalkable(column, row)) {
      blocked[node] = 1;
    }
  }

  const { entities, components } = world.query<
    [PositionEcsComponent, ColliderEcsComponent]
  >([positionId, colliderId]);
  const [positions, colliders] = components;
  // Rotation and rigid bodies are optional for colliders, so they're read
  // per entity rather than required by the query.
  const getRotation =
    world.getComponentAccessor<RotationEcsComponent>(rotationId);
  const getRigidBody =
    world.getComponentAccessor<RigidBodyEcsComponent>(rigidBodyId);

  for (let i = 0; i < entities.length; i++) {
    const collider = colliders[i];
    const rigidBody = getRigidBody(entities[i]);

    if (
      collider.sensor ||
      (collider.category & mask) === 0 ||
      (rigidBody !== null && rigidBody.type !== 'static')
    ) {
      continue;
    }

    const region = getColliderRegion({
      position: positions[i].world,
      rotation: getColliderRotation(getRotation(entities[i])),
      collider: collider.collider,
    });

    markRegion(frame, region, agentRadius, blocked);
  }

  grid.fillWalkableMask(blocked, false);
}
