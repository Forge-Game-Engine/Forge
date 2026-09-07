import { EcsWorld } from '../../ecs/ecs-world.js';
import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * ECS-style component interface for a world-space UI canvas that tracks
 * another entity's world *position* every frame, without inheriting its
 * rotation or scale - the diegetic-UI case (a health bar, nameplate, or
 * floating indicator that should stay upright above whatever it labels,
 * regardless of which way that entity is facing).
 *
 * Deliberately not expressed as `ParentEcsComponent` with an opt-out flag:
 * being parented already has an unambiguous meaning throughout the engine
 * (inherit the full world transform, exactly like any other entity in the
 * hierarchy - a turret mounted on a rotating tank, say), and a flag that
 * silently changes that meaning for one specific relationship would make
 * `ParentEcsComponent` itself ambiguous. "Follow this entity's position
 * only" is a different relationship entirely, so it gets its own,
 * separately-opted-into component instead.
 */
export interface UiWorldSpaceFollowEcsComponent {
  /**
   * The entity whose `PositionEcsComponent.world` this entity's own
   * position tracks every frame. Must have a `PositionEcsComponent` (a
   * `RotationEcsComponent`/`ScaleEcsComponent`, if any, are read by
   * `createTransformEcsSystem` when resolving *this* entity's own world
   * position, but never applied to it).
   */
  target: number;
}

export const uiWorldSpaceFollowId =
  createComponentId<UiWorldSpaceFollowEcsComponent>('uiWorldSpaceFollow');

/**
 * Attaches a {@link UiWorldSpaceFollowEcsComponent} to `entity`, read by
 * `createUiWorldSpaceFollowEcsSystem`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to - typically a
 * world-space canvas root (see `createUiCanvas`'s `renderMode: 'worldSpace'`).
 * @param options - Options for configuring the follow relationship.
 * `target` has no sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addUiWorldSpaceFollowComponent(
  world: EcsWorld,
  entity: number,
  options: UiWorldSpaceFollowEcsComponent,
): UiWorldSpaceFollowEcsComponent {
  return world.addComponent(entity, uiWorldSpaceFollowId, { ...options });
}
