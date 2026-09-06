import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * How `AspectRatioFitterEcsComponent` keeps `aspectRatio`:
 * - `widthControlsHeight` - the entity's height is derived from its width.
 * - `heightControlsWidth` - the entity's width is derived from its height.
 * - `fitInParent` - the entity's size is the largest size, matching
 *   `aspectRatio`, that fits entirely within the parent's rect.
 * - `envelopeParent` - the entity's size is the smallest size, matching
 *   `aspectRatio`, that fully covers the parent's rect.
 */
export type UiAspectRatioFitMode =
  | 'widthControlsHeight'
  | 'heightControlsWidth'
  | 'fitInParent'
  | 'envelopeParent';

/**
 * Fields of {@link AspectRatioFitterEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface AspectRatioFitterDefaultedOptions {
  /** How the aspect ratio is enforced. */
  aspectMode: UiAspectRatioFitMode;

  /** The width-to-height ratio to maintain, e.g. `16 / 9`. */
  aspectRatio: number;
}

export type AspectRatioFitterEcsComponent = AspectRatioFitterDefaultedOptions;

export const aspectRatioFitterId =
  createComponentId<AspectRatioFitterEcsComponent>('aspectRatioFitter');

const defaultAspectRatioFitterOptions: AspectRatioFitterDefaultedOptions = {
  aspectMode: 'widthControlsHeight',
  aspectRatio: 1,
};

/**
 * Attaches an {@link AspectRatioFitterEcsComponent} to `entity`, so
 * `createUiAspectRatioFitterEcsSystem` keeps its
 * `RectTransformEcsComponent`'s own size at a constant `aspectRatio` every
 * frame - useful for a portrait/thumbnail image or a minimap whose
 * container might otherwise stretch it. `fitInParent`/`envelopeParent` read
 * the parent's own resolved `rect` (one frame stale, like every other
 * cross-entity read in this module - see `createUiLayoutEcsSystem`'s own
 * doc comment) - `entity` needs a `ParentEcsComponent` for those two modes.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to. Assumes a
 * point-anchored `RectTransformEcsComponent` (its `x`/`y` are each a
 * literal size, not a stretch margin).
 * @param options - Options for configuring the fitter.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addAspectRatioFitterComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<AspectRatioFitterEcsComponent> = {},
): AspectRatioFitterEcsComponent {
  const component: AspectRatioFitterEcsComponent = {
    ...defaultAspectRatioFitterOptions,
    ...options,
  };

  return world.addComponent(entity, aspectRatioFitterId, component);
}
