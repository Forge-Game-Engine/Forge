import { parentId } from '../../common/components/parent-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import { Renderable } from '../../rendering/renderable.js';
import { uiClipId } from '../components/ui-clip-component.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import {
  defaultUiStyleOptions,
  uiRenderableId,
} from '../components/ui-renderable-component.js';
import {
  UiScrollEcsComponent,
  UiScrollEvent,
  uiScrollId,
} from '../components/ui-scroll-component.js';
import { createUiState, uiStateId } from '../components/ui-state-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import { destroyUiSubtree } from './destroy-ui-subtree.js';
import { setUiRect, UiRect } from './set-ui-rect.js';
import type { UiWidgetHandle } from './ui-widget-handle.js';

/**
 * Options for {@link createUiScrollGroup}.
 */
export interface CreateUiScrollGroupOptions {
  /**
   * Shared renderable for the viewport background panel.
   * All scroll groups sharing the same renderable are batched together.
   */
  renderable: Renderable<UiInstanceComponents>;

  /**
   * Shared renderable for the content container (typically transparent).
   * May be the same instance as `renderable`.
   */
  contentRenderable: Renderable<UiInstanceComponents>;

  // ── Layout ──────────────────────────────────────────────────────────────

  /**
   * Position and size of the viewport relative to the anchor point.
   * Mutually exclusive with providing `offsetMin` and `offsetMax`.
   */
  rect?: UiRect;

  /** Normalised (0–1) minimum anchor corner. Defaults to `(0, 0)`. */
  anchorMin?: Vector2;

  /** Normalised (0–1) maximum anchor corner. Defaults to `(0, 0)` (point anchor). */
  anchorMax?: Vector2;

  /** Pixel inset from the anchor-min edge (stretch-anchor mode). */
  offsetMin?: Vector2;

  /** Pixel inset from the anchor-max edge (stretch-anchor mode). */
  offsetMax?: Vector2;

  /** Normalised (0–1) pivot point. Defaults to `(0, 0)`. */
  pivot?: Vector2;

  /** Rotation in radians. Default `0`. */
  rotation?: number;

  /** Scale. Defaults to `(1, 1)`. */
  scale?: Vector2;

  /** Parent entity id for the viewport. */
  parent?: number;

  // ── Style ────────────────────────────────────────────────────────────────

  /** Viewport background colour. Defaults to `Color.white`. */
  tintColor?: Color;

  /** Viewport border colour. Defaults to `Color.transparent`. */
  borderColor?: Color;

  /** Viewport border width in CSS pixels. Default `0`. */
  borderWidth?: number;

  /** Viewport corner radius in CSS pixels. Default `0`. */
  cornerRadius?: number;

  /** Viewport opacity. Default `1`. */
  opacity?: number;

  /** Draw order within the canvas. Default `0`. */
  zIndex?: number;

  // ── Scroll behaviour ──────────────────────────────────────────────────────

  /**
   * Total height (or width) of the scrollable content in pixels.
   * Children should be laid out within this space.
   */
  contentSize: Vector2;

  /** Which axes are scrollable. Default `'vertical'`. */
  orientation?: 'vertical' | 'horizontal' | 'both';

  /** Called whenever the scroll offset changes. */
  onScroll?: (event: UiScrollEvent) => void;

  // ── Optional scrollbar ────────────────────────────────────────────────────

  /**
   * When `true`, a thin scrollbar track and thumb are added to the right edge
   * (for vertical orientation) or bottom edge (for horizontal). Default `false`.
   */
  showScrollbar?: boolean;

  /**
   * Shared renderable for the scrollbar track.
   * Required when `showScrollbar` is `true`.
   */
  scrollbarRenderable?: Renderable<UiInstanceComponents>;

  /** Scrollbar track width in CSS pixels. Default `8`. */
  scrollbarWidth?: number;

  /** Scrollbar track colour. Defaults to a semi-transparent dark tone. */
  scrollbarColor?: Color;

  /** Scrollbar thumb colour. Defaults to a mid-grey. */
  thumbColor?: Color;

  /** Scrollbar corner radius. Default `4`. */
  scrollbarCornerRadius?: number;
}

/**
 * Result returned by {@link createUiScrollGroup}.
 *
 * Implements {@link UiWidgetHandle} — call `destroy()` to remove the viewport,
 * content entity, and optional scrollbar entities.
 */
export interface CreateUiScrollGroupResult extends UiWidgetHandle<
  { content: number; scrollbar?: number; thumb?: number },
  { onScroll: ParameterizedForgeEvent<UiScrollEvent> }
> {
  /** The viewport (clip) entity id. */
  entity: number;

  /** The content container entity id. Add children with `parent: contentEntity`. */
  contentEntity: number;

  /** The scroll state component attached to the viewport entity. */
  scroll: UiScrollEcsComponent;
}

/**
 * Assembles a scroll group: a clipped viewport panel with a scrollable content
 * child entity.
 *
 * The viewport has `UiClipEcsComponent` so children outside its rect are
 * masked by the UI shader. The content entity's vertical (or horizontal)
 * offset is driven each frame by `UiScrollEcsComponent.scroll` via
 * {@link createUiScrollEcsSystem}.
 *
 * Add scrollable children with `parent: result.contentEntity`. Set
 * `UiScrollEcsComponent.contentSize` whenever the content changes size.
 *
 * Add {@link createUiScrollEcsSystem} to the world to enable wheel scrolling,
 * scrollbar drag, and ensure-visible keyboard behaviour.
 *
 * @param world - The ECS world to create entities in.
 * @param options - Layout, style, and scroll behaviour options.
 * @returns Entity ids, the scroll component, and runtime handles.
 */
export function createUiScrollGroup(
  world: EcsWorld,
  options: CreateUiScrollGroupOptions,
): CreateUiScrollGroupResult {
  const {
    renderable,
    contentRenderable,
    anchorMin = new Vector2(0, 0),
    anchorMax = new Vector2(0, 0),
    pivot = new Vector2(0, 0),
    rotation = 0,
    scale = new Vector2(1, 1),
    parent,
    tintColor = defaultUiStyleOptions.tintColor,
    borderColor = defaultUiStyleOptions.borderColor,
    borderWidth = defaultUiStyleOptions.borderWidth,
    cornerRadius = defaultUiStyleOptions.cornerRadius,
    opacity = defaultUiStyleOptions.opacity,
    zIndex = defaultUiStyleOptions.zIndex,
    contentSize,
    orientation = 'vertical',
    onScroll,
    showScrollbar = false,
    scrollbarRenderable,
    scrollbarWidth = 8,
    scrollbarColor = new Color(0, 0, 0, 0.2),
    thumbColor = new Color(0.5, 0.5, 0.5, 0.8),
    scrollbarCornerRadius = 4,
  } = options;

  // ── Viewport entity ────────────────────────────────────────────────────

  const viewportEntity = world.createEntity();

  const viewportTransform = world.addComponent(viewportEntity, uiTransformId, {
    anchorMin: anchorMin.clone(),
    anchorMax: anchorMax.clone(),
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(0, 0),
    pivot: pivot.clone(),
    rotation,
    scale: scale.clone(),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  });

  if (options.rect) {
    setUiRect(viewportTransform, options.rect);
  } else if (options.offsetMin && options.offsetMax) {
    viewportTransform.offsetMin = options.offsetMin.clone();
    viewportTransform.offsetMax = options.offsetMax.clone();
  }

  world.addComponent(viewportEntity, uiRenderableId, {
    renderable,
    enabled: true,
    tintColor,
    borderColor,
    borderWidth,
    cornerRadius,
    opacity,
    zIndex,
  });

  world.addComponent(viewportEntity, uiClipId, { enabled: true });

  world.addComponent(viewportEntity, uiInteractableId, {
    enabled: true,
    blocksPointer: true,
  });

  world.addComponent(viewportEntity, uiStateId, {
    ...createUiState(),
    disabled: false,
  });

  if (parent !== undefined) {
    world.addComponent(viewportEntity, parentId, { parent });
  }

  // ── Content entity ─────────────────────────────────────────────────────
  // Stretches horizontally to fill the viewport; height is the full content
  // size. Vertical position is driven by -scroll.y each frame.

  const contentEntity = world.createEntity();

  world.addComponent(contentEntity, uiTransformId, {
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 0),
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(0, contentSize.y),
    pivot: new Vector2(0, 0),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  });

  world.addComponent(contentEntity, uiRenderableId, {
    renderable: contentRenderable,
    enabled: true,
    tintColor: Color.transparent,
    borderColor: Color.transparent,
    borderWidth: 0,
    cornerRadius: 0,
    opacity: 1,
    zIndex,
  });

  world.addComponent(contentEntity, parentId, { parent: viewportEntity });

  // ── Scroll component ───────────────────────────────────────────────────

  const scrollComp = world.addComponent(viewportEntity, uiScrollId, {
    scroll: new Vector2(0, 0),
    contentSize: contentSize.clone(),
    viewportSize: new Vector2(0, 0),
    orientation,
    onScroll: new ParameterizedForgeEvent<UiScrollEvent>('ui.scroll'),
    contentEntity,
  });

  if (onScroll) {
    scrollComp.onScroll.registerListener(onScroll);
  }

  // ── Optional scrollbar ─────────────────────────────────────────────────

  let scrollbarEntity: number | undefined;
  let thumbEntity: number | undefined;

  if (showScrollbar && scrollbarRenderable) {
    scrollbarEntity = world.createEntity();

    world.addComponent(scrollbarEntity, uiTransformId, {
      anchorMin: new Vector2(1, 0),
      anchorMax: new Vector2(1, 1),
      offsetMin: new Vector2(-scrollbarWidth, 0),
      offsetMax: new Vector2(0, 0),
      pivot: new Vector2(0, 0),
      rotation: 0,
      scale: new Vector2(1, 1),
      resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
      worldMatrix: Matrix3x3.identity,
      isDirty: true,
    });

    world.addComponent(scrollbarEntity, uiRenderableId, {
      renderable: scrollbarRenderable,
      enabled: true,
      tintColor: scrollbarColor,
      borderColor: Color.transparent,
      borderWidth: 0,
      cornerRadius: scrollbarCornerRadius,
      opacity: 1,
      zIndex: zIndex + 1,
    });

    world.addComponent(scrollbarEntity, uiInteractableId, {
      enabled: true,
      blocksPointer: true,
    });

    world.addComponent(scrollbarEntity, uiStateId, {
      ...createUiState(),
      disabled: false,
    });

    world.addComponent(scrollbarEntity, parentId, { parent: viewportEntity });

    thumbEntity = world.createEntity();

    world.addComponent(thumbEntity, uiTransformId, {
      anchorMin: new Vector2(0, 0),
      anchorMax: new Vector2(1, 0),
      offsetMin: new Vector2(0, 0),
      offsetMax: new Vector2(0, scrollbarWidth),
      pivot: new Vector2(0, 0),
      rotation: 0,
      scale: new Vector2(1, 1),
      resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
      worldMatrix: Matrix3x3.identity,
      isDirty: true,
    });

    world.addComponent(thumbEntity, uiRenderableId, {
      renderable: scrollbarRenderable,
      enabled: true,
      tintColor: thumbColor,
      borderColor: Color.transparent,
      borderWidth: 0,
      cornerRadius: scrollbarCornerRadius,
      opacity: 1,
      zIndex: zIndex + 2,
    });

    world.addComponent(thumbEntity, uiInteractableId, {
      enabled: true,
      blocksPointer: true,
    });

    world.addComponent(thumbEntity, uiStateId, {
      ...createUiState(),
      disabled: false,
    });

    world.addComponent(thumbEntity, parentId, { parent: scrollbarEntity });

    scrollComp.scrollbarEntity = scrollbarEntity;
    scrollComp.thumbEntity = thumbEntity;
  }

  return {
    entity: viewportEntity,
    contentEntity,
    scroll: scrollComp,
    parts: {
      content: contentEntity,
      scrollbar: scrollbarEntity,
      thumb: thumbEntity,
    },
    events: { onScroll: scrollComp.onScroll },
    destroy: (): void => {
      scrollComp.onScroll.clear();
      destroyUiSubtree(world, viewportEntity);
    },
  };
}
