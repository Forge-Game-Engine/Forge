import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { withDefaults } from '../../utilities/with-defaults.js';

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
 * behind its parent. To draw a child just behind its parent, set
 * `behindParent` instead.
 */
export interface DrawOrderEcsComponent {
  /**
   * An integer in `[-maxDrawOrder, maxDrawOrder]`, added to the parent's
   * world order.
   */
  order: number;

  /**
   * Whether the entity, with everything parented under it, comes just
   * before its parent in hierarchy order instead of after it, so it draws
   * behind its parent and in front of whatever its parent draws in front
   * of. Siblings that set it keep their sibling order among themselves. It
   * has no effect on an entity without a parent.
   */
  behindParent: boolean;

  /**
   * Whether, under a camera with `ySort`, each of this entity's children
   * sorts by its own Y instead of by this entity's.
   *
   * A camera that y-sorts orders sort units by Y. Every entity belongs to
   * one:
   *
   * 1. A root entity is a sort unit.
   * 2. When a sort unit sets `ySortChildren`, each of its children is a sort
   *    unit too, and this rule applies to them in turn.
   * 3. Every other entity belongs to the unit of its nearest ancestor that
   *    is one, and draws with it, in hierarchy order.
   *
   * So `ySortChildren` has no effect on an entity that isn't itself a sort
   * unit. For example, for walls under a `layer` entity under a `level`
   * root to sort against a `character` root, both `level` and `layer` set
   * `ySortChildren`. The character's sword, a child of the character, still
   * draws with the character. Units at the same Y draw in hierarchy order:
   * roots in creation order, units under one root in sibling order.
   *
   * Cameras without `ySort` ignore it.
   */
  ySortChildren: boolean;

  /**
   * Where, under a camera with `ySort`, this entity's sort unit sorts when
   * the entity is a sort unit (see `ySortChildren`): at the world Y of the
   * point `(0, ySortOrigin)` in the entity's local space, so the point
   * follows the entity's rotation and scale. A positive value moves it down.
   * For example, a tree sprite with a centred pivot and a height of `4`
   * sorts at the base of its trunk with `ySortOrigin: 2`.
   *
   * It has no effect on an entity that isn't a sort unit, or under a camera
   * without `ySort`.
   */
  ySortOrigin: number;
}

/** The component key of {@link DrawOrderEcsComponent}. */
export const drawOrderId =
  createComponentId<DrawOrderEcsComponent>('drawOrder');

const defaultDrawOrderOptions: DrawOrderEcsComponent = {
  order: 0,
  behindParent: false,
  ySortChildren: false,
  ySortOrigin: 0,
};

/**
 * Attaches a {@link DrawOrderEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the draw order.
 * @returns The attached component, for further tuning or runtime changes.
 * @throws An error if `order` isn't an integer in
 * `[-maxDrawOrder, maxDrawOrder]`, or if `ySortOrigin` isn't finite.
 */
export function addDrawOrderComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<DrawOrderEcsComponent> = {},
): DrawOrderEcsComponent {
  const component: DrawOrderEcsComponent = withDefaults(
    defaultDrawOrderOptions,
    options,
  );

  if (
    !Number.isInteger(component.order) ||
    Math.abs(component.order) > maxDrawOrder
  ) {
    throw new Error(
      `Unable to add a draw order of ${component.order}, it must be an integer from ${-maxDrawOrder} to ${maxDrawOrder}.`,
    );
  }

  if (!Number.isFinite(component.ySortOrigin)) {
    throw new Error(
      `Unable to add a draw order with a ySortOrigin of ${component.ySortOrigin}, it must be a finite number.`,
    );
  }

  return world.addComponent(entity, drawOrderId, component);
}
