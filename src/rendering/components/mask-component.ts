import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';

/**
 * Clips to the mask's whole rect. Nested rect masks intersect, so content
 * is clipped to every rect mask above it. Clipping is axis-aligned in world
 * space: a rotated rect mask clips to its world bounds.
 */
export interface RectMaskShape {
  kind: 'rect';
}

/** The edge of the mask's rect a linear mask reveals from. */
export type LinearMaskOrigin = 'left' | 'right' | 'bottom' | 'top';

/**
 * Reveals part of the mask's rect, starting from one edge: `amount` of the
 * rect's width (from `'left'` or `'right'`) or height (from `'bottom'` or
 * `'top'`). A filling bar.
 */
export interface LinearMaskShape {
  kind: 'linear';

  /** The edge the revealed part starts from, in the mask entity's own frame. */
  origin: LinearMaskOrigin;

  /** How much of the rect is revealed, `0` (nothing) to `1` (all of it). */
  amount: number;
}

/**
 * Reveals a sector of the mask's rect around its center: the part between
 * `startAngle` and `startAngle + sweep * amount`. A draining ring or a
 * cooldown.
 */
export interface RadialMaskShape {
  kind: 'radial';

  /**
   * Where the sector starts, in radians in the mask entity's own frame: `0`
   * points along `+X` and a positive angle turns towards `+Y`
   * (counter-clockwise).
   */
  startAngle: number;

  /**
   * The sector's full extent at `amount: 1`, in radians: positive turns
   * counter-clockwise from `startAngle`, negative clockwise. A full turn is
   * `2 * Math.PI`; less gives an arc gauge.
   */
  sweep: number;

  /** How much of `sweep` is revealed, `0` (nothing) to `1` (all of it). */
  amount: number;
}

/** What part of a {@link MaskEcsComponent}'s rect shows what it clips. */
export type MaskShape = RectMaskShape | LinearMaskShape | RadialMaskShape;

/**
 * Fields of {@link MaskEcsComponent} with no sensible default; callers must
 * always provide these.
 */
export interface MaskRequiredOptions {
  /** The mask rect's width in world units, before the entity's scale. */
  width: number;

  /** The mask rect's height in world units, before the entity's scale. */
  height: number;
}

/**
 * Fields of {@link MaskEcsComponent} with a sensible default; callers may
 * omit these.
 */
export interface MaskDefaultedOptions {
  /**
   * The point of the rect placed at the entity's position, normalized to
   * the rect's size, Y-up: `(0, 0)` is the bottom-left corner and
   * `(0.5, 0.5)` (the default) the center, as for a sprite's `pivot`.
   */
  pivot: Vector2;

  /** The part of the rect that shows. Defaults to the whole rect. */
  shape: MaskShape;
}

/**
 * Clips the sprites and text of its entity and of every descendant to a
 * rect, placed like a sprite's quad by the entity's world position,
 * rotation, scale and flip. The `shape` can show the whole rect, part of it
 * from one edge (`'linear'`), or a sector around its center (`'radial'`).
 * Edges are anti-aliased.
 *
 * Content can be clipped by any number of rect masks (they intersect) but
 * by at most one linear or radial mask; the render system throws for two.
 */
export interface MaskEcsComponent
  extends MaskRequiredOptions, MaskDefaultedOptions {}

export const maskId = createComponentId<MaskEcsComponent>('mask');

/**
 * Attaches a {@link MaskEcsComponent} to `entity`, clipping its sprites and
 * text and those of its descendants.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the mask. `width` and `height`
 * have no sensible default and must always be provided. `pivot` and `shape`
 * are copied, so systems can write them in place.
 * @returns The attached component, for runtime changes (e.g. writing
 * `shape.amount`).
 */
export function addMaskComponent(
  world: EcsWorld,
  entity: number,
  options: MaskRequiredOptions & Partial<MaskDefaultedOptions>,
): MaskEcsComponent {
  const defaultMaskOptions: MaskDefaultedOptions = {
    pivot: { x: 0.5, y: 0.5 },
    shape: { kind: 'rect' },
  };

  const component: MaskEcsComponent = { ...defaultMaskOptions, ...options };

  component.pivot = Vec2.clone(component.pivot);
  component.shape = { ...component.shape };

  return world.addComponent(entity, maskId, component);
}
