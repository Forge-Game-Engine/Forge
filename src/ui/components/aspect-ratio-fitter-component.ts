import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * How `AspectRatioFitterEcsComponent` keeps `aspectRatio`:
 * - `widthControlsHeight` - `sizeDelta.y` is derived from `sizeDelta.x`.
 * - `heightControlsWidth` - `sizeDelta.x` is derived from `sizeDelta.y`.
 * - `fitInParent` - `sizeDelta` is the largest size, matching `aspectRatio`,
 *   that fits entirely within the parent's rect.
 * - `envelopeParent` - `sizeDelta` is the smallest size, matching
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
 * `RectTransformEcsComponent.sizeDelta` at a constant `aspectRatio` every
 * frame - useful for a portrait/thumbnail image or a minimap whose
 * container might otherwise stretch it. `fitInParent`/`envelopeParent` read
 * the parent's own resolved `rect` (one frame stale, like every other
 * cross-entity read in this module - see `createUiLayoutEcsSystem`'s own
 * doc comment) - `entity` needs a `ParentEcsComponent` for those two modes.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to. Assumes a
 * point-anchored `RectTransformEcsComponent` (`sizeDelta` is a literal
 * size, not a stretch margin).
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
