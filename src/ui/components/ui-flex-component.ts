import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * Flex layout direction.
 * @experimental F1.5 flex layout is a spike; adopt/defer decision pending.
 */
export type UiFlexDirection = 'row' | 'column';

/**
 * How children are distributed along the main axis.
 * @experimental
 */
export type UiFlexJustify = 'start' | 'center' | 'end' | 'space-between';

/**
 * How children are aligned on the cross axis.
 * @experimental
 */
export type UiFlexAlign = 'start' | 'center' | 'end' | 'stretch';

/**
 * Attach to a UI entity to lay out its direct children in a flex-style flow
 * rather than using anchor/offset positioning. Children inside a flex container
 * have their `resolvedRect` computed by {@link createUiFlexLayoutEcsSystem}
 * instead of by their own anchor settings.
 *
 * @experimental This feature is a spike (Epic 1 F1.5). It is isolated behind
 * this component so the anchor model (F1.3/F1.4) is fully usable without it.
 * Adoption/deferral will be recorded in the Epic 1 changelog.
 */
export interface UiFlexEcsComponent {
  /** Direction children are stacked along. */
  direction: UiFlexDirection;

  /** Gap between consecutive children in pixels. */
  gap: number;

  /** Distribution of children along the main axis. */
  justify: UiFlexJustify;

  /** Alignment of children on the cross axis. */
  align: UiFlexAlign;

  /** Uniform padding inside the container on all sides, in pixels. */
  padding: number;
}

/** Component id for {@link UiFlexEcsComponent}. */
export const uiFlexId = createComponentId<UiFlexEcsComponent>('ui-flex');
