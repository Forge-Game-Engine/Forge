import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { MouseButton } from '../constants/index.js';

/**
 * ECS-style component interface for a canvas-space pointer. Every field is
 * written once per tick by `createPointerEcsSystem` from a
 * `PointerInputSource` (e.g. `MouseInputSource`) and is read-only to
 * callers.
 *
 * `position` is deliberately in canvas pixels, not world space: with a
 * dedicated UI camera, a single canvas position maps to a different world
 * position through every camera that might convert it, so converting is
 * left to the caller (via `screenToWorldSpace`) rather than baked in here.
 */
export interface PointerEcsComponent {
  /**
   * The pointer's current position in canvas pixels: Y-down, origin at the
   * canvas's top-left corner.
   */
  position: Vector2;

  /** How far `position` moved since the last tick, in canvas pixels. */
  delta: Vector2;

  /**
   * Accumulated wheel scroll delta (`WheelEvent.deltaY`) since the last
   * tick.
   */
  scroll: number;

  /** Buttons that started being held down since the last tick. */
  buttonsDown: ReadonlySet<MouseButton>;

  /** Buttons currently held down. */
  buttonsHeld: ReadonlySet<MouseButton>;

  /** Buttons that stopped being held down since the last tick. */
  buttonsUp: ReadonlySet<MouseButton>;
}

export const pointerId = createComponentId<PointerEcsComponent>('pointer');

/**
 * Attaches a {@link PointerEcsComponent} to `entity`, zeroed out until
 * `createPointerEcsSystem` first updates it.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addPointerComponent(
  world: EcsWorld,
  entity: number,
): PointerEcsComponent {
  const component: PointerEcsComponent = {
    position: Vec2.zero,
    delta: Vec2.zero,
    scroll: 0,
    buttonsDown: new Set(),
    buttonsHeld: new Set(),
    buttonsUp: new Set(),
  };

  return world.addComponent(entity, pointerId, component);
}
