import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import {
  addMaskComponent,
  addSpriteComponent,
  NineSliceOptions,
  SpriteEcsComponent,
} from '../../rendering/index.js';
import { addContentSizeFitterComponent } from '../components/content-size-fitter-component.js';
import {
  addVerticalLayoutGroupComponent,
  UiAxisLayoutGroupDefaultedOptions,
} from '../components/layout-group-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import {
  addUiInteractableComponent,
  UiInteractableEcsComponent,
} from '../components/ui-interactable-component.js';
import {
  addUiScrollRectComponent,
  UiScrollbar,
  UiScrollRectDefaultedOptions,
  UiScrollRectEcsComponent,
} from '../components/ui-scroll-rect-component.js';
import { UiAnchor, UiAnchorConfig } from '../types/ui-anchor.js';
import { UiAxis } from '../types/ui-axis.js';
import { createPanel } from './create-panel.js';

/**
 * Fields of {@link CreateScrollViewOptions} with a sensible default, or that
 * are genuinely optional (no default at all); callers may omit these.
 */
export interface CreateScrollViewDefaultedOptions {
  /**
   * The anchor to place the viewport with - see `UiAnchor` for common
   * presets. Defaults to `UiAnchor.center({ x: 400, y: 300 })`.
   */
  anchor: UiAnchorConfig;

  /** Offset of the viewport's pivot from its anchor reference point, in reference pixels. */
  anchoredPosition?: Vector2;

  /**
   * The sprite to draw the viewport's background with. Omitted, the
   * viewport has no background.
   */
  sprite?: SpriteEcsComponent;

  /** Overrides `sprite.slices` for the background. */
  slices?: NineSliceOptions;

  /**
   * Options for the content's `VerticalLayoutGroupEcsComponent`, which
   * stacks the list's items top to bottom. By default each item keeps its
   * own height and is stretched to the list's width.
   */
  layout?: Partial<UiAxisLayoutGroupDefaultedOptions>;

  /**
   * The sprite to draw the vertical scrollbar's track with. The scrollbar
   * is only created when this and `scrollbarHandleSprite` are both given.
   */
  scrollbarSprite?: SpriteEcsComponent;

  /** The sprite to draw the vertical scrollbar's handle with. */
  scrollbarHandleSprite?: SpriteEcsComponent;

  /**
   * The scrollbar's width, in reference pixels. The content is narrowed by
   * the same amount so the scrollbar doesn't cover it. Defaults to `16`.
   */
  scrollbarWidth: number;

  /** Overrides for the scroll rect's movement: its edges, elasticity and deceleration. */
  scrollRect?: Partial<
    Pick<
      UiScrollRectDefaultedOptions,
      'movementType' | 'elasticity' | 'decelerationRate'
    >
  >;
}

export type CreateScrollViewOptions = Partial<CreateScrollViewDefaultedOptions>;

export interface ScrollView {
  /**
   * The scroll view's root entity, the viewport: a `RectTransformEcsComponent`
   * + rect `MaskEcsComponent` + `UiInteractableEcsComponent` +
   * `UiScrollRectEcsComponent`, plus a `SpriteEcsComponent` if a `sprite`
   * was given.
   */
  entity: number;

  /**
   * The content entity: parent the list's items to it. It stacks them with
   * a vertical layout group and grows to fit them.
   */
  content: number;

  /** The viewport's `UiScrollRectEcsComponent`, for reading or writing `offset`. */
  scrollRect: UiScrollRectEcsComponent;

  /** The viewport's `UiInteractableEcsComponent`, the drag and wheel surface. */
  interactable: UiInteractableEcsComponent;

  /** The vertical scrollbar's entities, if it was created. */
  verticalScrollbar?: UiScrollbar;
}

/** Creates the viewport entity: a panel when there's a background sprite, else a bare rect. */
function createViewport(
  world: EcsWorld,
  parent: number,
  anchor: UiAnchorConfig,
  anchoredPosition: Vector2 | undefined,
  sprite: SpriteEcsComponent | undefined,
  slices: NineSliceOptions | undefined,
): number {
  if (sprite) {
    return createPanel(world, parent, {
      anchor,
      ...(anchoredPosition && { anchoredPosition }),
      sprite,
      slices,
    });
  }

  const entity = world.createEntity();

  addPositionComponent(world, entity);
  world.setParent(entity, parent);
  addRectTransformComponent(world, entity, {
    ...anchor,
    ...(anchoredPosition && { anchoredPosition }),
  });

  return entity;
}

/** Creates a vertical scrollbar along the viewport's right edge. */
function createVerticalScrollbar(
  world: EcsWorld,
  viewport: number,
  trackSprite: SpriteEcsComponent,
  handleSprite: SpriteEcsComponent,
  width: number,
): UiScrollbar {
  const track = world.createEntity();

  addPositionComponent(world, track);
  world.setParent(track, viewport);
  addRectTransformComponent(world, track, UiAnchor.stretchRight({ width }));
  addSpriteComponent(world, track, { ...trackSprite });
  // The track takes its own drags (rather than handing them to the
  // viewport) and responds from the first pixel, like a slider. Focus goes
  // to the controls in the list instead, which scroll into view.
  addUiInteractableComponent(world, track, {
    dragThreshold: 0,
    receivesDrag: true,
    focusable: false,
  });

  const handle = world.createEntity();

  addPositionComponent(world, handle);
  world.setParent(handle, track);
  addRectTransformComponent(world, handle, {
    // `createUiScrollRectEcsSystem` writes the anchors every tick.
    x: UiAxis.stretch({ min: 0, max: 1 }),
    y: UiAxis.stretch({ min: 0, max: 1 }),
  });
  addSpriteComponent(world, handle, { ...handleSprite });

  return { track, handle };
}

/**
 * Creates a scroll view: a viewport that clips a vertical list to its rect
 * and scrolls it by dragging (anywhere on it, including on the list's
 * buttons), the mouse wheel, an optional vertical scrollbar and focus
 * navigation, with inertia and elastic edges. Parent the list's items to
 * the returned `content`, which stacks them top to bottom and grows to fit
 * them.
 *
 * The viewport has a rect `MaskEcsComponent` and a
 * `UiInteractableEcsComponent` that receives drags and can't be focused,
 * plus a `UiScrollRectEcsComponent` scrolling only vertically. For other
 * layouts - a horizontal strip, a grid, a large map - assemble the same
 * components yourself.
 * @param world - The ECS world to create the scroll view in.
 * @param parent - The parent entity - a canvas (see `createUiCanvas`) or
 * another UI element.
 * @param options - Options for configuring the scroll view.
 * @returns The created scroll view: its viewport entity, its content
 * entity, its `UiScrollRectEcsComponent` and `UiInteractableEcsComponent`,
 * and its scrollbar, if any.
 */
export function createScrollView(
  world: EcsWorld,
  parent: number,
  options: CreateScrollViewOptions = {},
): ScrollView {
  const defaultCreateScrollViewOptions = {
    anchor: UiAnchor.center({ x: 400, y: 300 }),
    scrollbarWidth: 16,
  };

  const {
    anchor,
    anchoredPosition,
    sprite,
    slices,
    layout,
    scrollbarSprite,
    scrollbarHandleSprite,
    scrollbarWidth,
    scrollRect: scrollRectOptions,
  } = { ...defaultCreateScrollViewOptions, ...options };

  const entity = createViewport(
    world,
    parent,
    anchor,
    anchoredPosition,
    sprite,
    slices,
  );

  // The layout system sizes the mask to the viewport's rect.
  addMaskComponent(world, entity, { width: 0, height: 0 });

  const interactable = addUiInteractableComponent(world, entity, {
    receivesDrag: true,
    focusable: false,
  });

  const hasScrollbar = !!scrollbarSprite && !!scrollbarHandleSprite;

  const content = world.createEntity();

  addPositionComponent(world, content);
  world.setParent(content, entity);
  addRectTransformComponent(
    world,
    content,
    UiAnchor.stretchTopLeft({
      height: 0,
      horizontalMargin: hasScrollbar ? -scrollbarWidth : 0,
    }),
  );
  addVerticalLayoutGroupComponent(world, content, {
    childForceExpandHeight: false,
    childControlHeight: false,
    ...layout,
  });
  addContentSizeFitterComponent(world, content, {
    verticalFit: 'preferredSize',
  });

  const verticalScrollbar = hasScrollbar
    ? createVerticalScrollbar(
        world,
        entity,
        scrollbarSprite,
        scrollbarHandleSprite,
        scrollbarWidth,
      )
    : undefined;

  const scrollRect = addUiScrollRectComponent(world, entity, {
    content,
    horizontal: false,
    ...scrollRectOptions,
    ...(verticalScrollbar && { verticalScrollbar }),
  });

  return {
    entity,
    content,
    scrollRect,
    interactable,
    ...(verticalScrollbar && { verticalScrollbar }),
  };
}
