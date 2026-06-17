import { createComponentId } from '../../ecs/ecs-component.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { Vector2 } from '../../math/index.js';

/**
 * Payload for {@link UiScrollEcsComponent} scroll events.
 */
export interface UiScrollEvent {
  /** The scroll group viewport entity. */
  entity: number;
  /** The new scroll offset in pixels. */
  scroll: Vector2;
}

/**
 * Stores scroll state for a scroll group viewport entity.
 *
 * Attached to the viewport entity created by {@link createUiScrollGroup}.
 * The scroll ECS system reads and writes this component to drive wheel,
 * drag-to-scroll, and keyboard ensure-visible behaviour.
 */
export interface UiScrollEcsComponent {
  /** Current scroll offset in pixels. `(0, 0)` is fully scrolled to the top-left. */
  scroll: Vector2;

  /**
   * Total size of the scrollable content in pixels.
   * Set once in the factory; update at runtime when content changes size.
   */
  contentSize: Vector2;

  /**
   * Size of the visible viewport in pixels.
   * Synced each frame from the viewport entity's `resolvedRect.size`
   * by {@link createUiScrollEcsSystem}.
   */
  viewportSize: Vector2;

  /** Which axes are scrollable. */
  orientation: 'vertical' | 'horizontal' | 'both';

  /** Raised whenever `scroll` changes. */
  onScroll: ParameterizedForgeEvent<UiScrollEvent>;

  /**
   * The content child entity whose transform offset is driven by `scroll`.
   * Add children to the content entity (not the viewport) via `parent: contentEntity`.
   */
  contentEntity: number;

  /**
   * Optional vertical scrollbar track entity.
   * `undefined` when no scrollbar was requested.
   */
  scrollbarEntity?: number;

  /**
   * Optional scrollbar thumb entity (child of `scrollbarEntity`).
   * `undefined` when no scrollbar was requested.
   */
  thumbEntity?: number;
}

/** Component id for {@link UiScrollEcsComponent}. */
export const uiScrollId = createComponentId<UiScrollEcsComponent>('ui-scroll');
