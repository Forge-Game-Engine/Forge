import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Collider } from '@forge-game-engine/forge/physics';
import { MeshMaterial } from '@forge-game-engine/forge/rendering';

/**
 * Draws the loops of a `ChainCollider` as lines, on child entities of the
 * entity it's on. Put it on a child of the collider's entity, so the lines
 * are in the collider's local space.
 */
export interface ColliderOutlineEcsComponent {
  /** The entity whose `ColliderEcsComponent` is drawn. */
  target: number;

  /** The material the lines are drawn with. */
  material: MeshMaterial;

  /** The draw layer the lines sort by. */
  layer: number;

  /**
   * The collider the lines were last built from, or `null` before the
   * first build. The outline system rebuilds the lines when the target's
   * collider isn't this one.
   */
  drawnCollider: Collider | null;
}

export const colliderOutlineId =
  createComponentId<ColliderOutlineEcsComponent>('collider-outline');

/**
 * Adds a collider outline to an entity.
 * @param world - The world the entity belongs to.
 * @param entity - The entity to draw the lines under.
 * @param options - The entity whose collider is drawn, the material and the
 * draw layer.
 * @returns The added component.
 */
export function addColliderOutlineComponent(
  world: EcsWorld,
  entity: number,
  options: Omit<ColliderOutlineEcsComponent, 'drawnCollider'>,
): ColliderOutlineEcsComponent {
  const outline = { ...options, drawnCollider: null };

  world.addComponent(entity, colliderOutlineId, outline);

  return outline;
}
