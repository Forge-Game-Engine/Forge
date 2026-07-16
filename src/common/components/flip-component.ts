import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for flipping sprites.
 */
export interface FlipEcsComponent {
  flipX: boolean;
  flipY: boolean;
}

export const flipId = createComponentId<FlipEcsComponent>('flip');

const defaultFlipOptions: FlipEcsComponent = {
  flipX: false,
  flipY: false,
};

/**
 * Attaches a {@link FlipEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the flip.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addFlipComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<FlipEcsComponent> = {},
): FlipEcsComponent {
  const component: FlipEcsComponent = {
    ...defaultFlipOptions,
    ...options,
  };

  return world.addComponent(entity, flipId, component);
}
