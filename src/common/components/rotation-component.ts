import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Options for {@link addRotationComponent}.
 */
export interface RotationOptions {
  /**
   * The entity's rotation in radians relative to its parent, or to the
   * world when it has no parent. This is the value to write when rotating
   * the entity.
   */
  local: number;
}

/**
 * ECS-style component interface for rotation.
 */
export interface RotationEcsComponent extends RotationOptions {
  /**
   * The entity's rotation in world space, in radians. Output only:
   * `createTransformEcsSystem` writes it every frame from `local` and the
   * parent's world rotation. It starts out equal to `local`.
   */
  world: number;
}

export const rotationId = createComponentId<RotationEcsComponent>('rotation');

const defaultRotationOptions: RotationOptions = {
  local: 0,
};

/**
 * Attaches a {@link RotationEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the rotation.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addRotationComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<RotationOptions> = {},
): RotationEcsComponent {
  const rotationOptions: RotationOptions = {
    ...defaultRotationOptions,
    ...options,
  };

  return world.addComponent(entity, rotationId, {
    ...rotationOptions,
    world: rotationOptions.local,
  });
}
