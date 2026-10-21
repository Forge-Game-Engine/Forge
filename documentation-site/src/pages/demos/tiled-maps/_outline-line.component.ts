import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Geometry } from '@forge-game-engine/forge/rendering';

/**
 * Owns the geometry of one line of a collider outline, which the line's
 * `MeshEcsComponent` draws. The geometry is disposed when the component is
 * removed, as when the outline system replaces the lines or the line's
 * entity is removed with an ancestor.
 */
export interface OutlineLineEcsComponent {
  /** The line's geometry. */
  geometry: Geometry;
}

/** Disposes the removed line's geometry. */
function releaseOutlineLine(
  _world: EcsWorld,
  _entity: number,
  line: OutlineLineEcsComponent,
): void {
  line.geometry.dispose();
}

export const outlineLineId = createComponentId<OutlineLineEcsComponent>(
  'outline-line',
  { onRemove: releaseOutlineLine },
);

/**
 * Gives an entity the geometry of an outline line to own.
 * @param world - The world the entity belongs to.
 * @param entity - The line's entity.
 * @param geometry - The geometry the line's mesh draws.
 * @returns The added component.
 */
export function addOutlineLineComponent(
  world: EcsWorld,
  entity: number,
  geometry: Geometry,
): OutlineLineEcsComponent {
  const line = { geometry };

  world.addComponent(entity, outlineLineId, line);

  return line;
}
