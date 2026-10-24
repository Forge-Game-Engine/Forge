import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { Color } from '@forge-game-engine/forge/rendering';

/**
 * The lines drawn along one unit's path. Written only by the path lines
 * system.
 */
export interface UnitPathLinesEcsComponent {
  /** The color of the unit and its smoothed path. */
  color: Color;

  /**
   * The agent's `path` the raw path was found for. The agent system makes
   * a new array each time it plans, so a different array means a new path.
   */
  drawnPath: readonly Vector2[] | null;

  /** The path through the cell centres, before smoothing. */
  rawPath: Vector2[];

  /** The line segment entities of the smoothed path, reused each frame. */
  smoothedSegments: number[];

  /** The line segment entities of the raw path, reused each frame. */
  rawSegments: number[];
}

export const unitPathLinesId =
  createComponentId<UnitPathLinesEcsComponent>('unit-path-lines');

/**
 * Attaches a {@link UnitPathLinesEcsComponent} to a unit.
 * @param world - The world the unit belongs to.
 * @param entity - The unit.
 * @param color - The color of its smoothed path.
 * @returns The attached component.
 */
export function addUnitPathLinesComponent(
  world: EcsWorld,
  entity: number,
  color: Color,
): UnitPathLinesEcsComponent {
  return world.addComponent(entity, unitPathLinesId, {
    color,
    drawnPath: null,
    rawPath: [],
    smoothedSegments: [],
    rawSegments: [],
  });
}
