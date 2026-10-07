import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * The largest `DrawOrderEcsComponent.order` magnitude. Bounding each
 * entity's own order keeps the sum down any realistic hierarchy an exact
 * 32-bit integer.
 */
export const maxDrawOrder = 4096;

/**
 * Moves an entity, and everything parented under it, forwards or backwards
 * in the draw order of its sprite and text layer. An entity without one has
 * an order of `0`.
 *
 * Orders are relative: an entity's world order is its own `order` plus its
 * parent's world order. Within a layer, a lower world order draws first,
 * and entities with the same world order draw in hierarchy order (parents
 * before their children, siblings in the order they were parented). So a
 * child at `-1` draws behind every entity at its parent's level, not just
 * behind its parent.
 */
export interface DrawOrderEcsComponent {
  /**
   * An integer in `[-maxDrawOrder, maxDrawOrder]`, added to the parent's
   * world order.
   */
  order: number;
}

/** The component key of {@link DrawOrderEcsComponent}. */
export const drawOrderId =
  createComponentId<DrawOrderEcsComponent>('drawOrder');

const defaultDrawOrderOptions: DrawOrderEcsComponent = {
  order: 0,
};

/**
 * Attaches a {@link DrawOrderEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the draw order.
 * @returns The attached component, for further tuning or runtime changes.
 * @throws An error if `order` isn't an integer in
 * `[-maxDrawOrder, maxDrawOrder]`.
 */
export function addDrawOrderComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<DrawOrderEcsComponent> = {},
): DrawOrderEcsComponent {
  const component: DrawOrderEcsComponent = {
    ...defaultDrawOrderOptions,
    ...options,
  };

  if (
    !Number.isInteger(component.order) ||
    Math.abs(component.order) > maxDrawOrder
  ) {
    throw new Error(
      `Unable to add a draw order of ${component.order}, it must be an integer from ${-maxDrawOrder} to ${maxDrawOrder}.`,
    );
  }

  return world.addComponent(entity, drawOrderId, component);
}
