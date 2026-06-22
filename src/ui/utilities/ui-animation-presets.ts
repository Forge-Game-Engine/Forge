import { easeInBack } from '../../animations/easing-functions/ease-in-back.js';
import { easeOutBack } from '../../animations/easing-functions/ease-out-back.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import { uiScrollId } from '../components/ui-scroll-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import {
  animateUiOffsetMinX,
  animateUiOffsetMinY,
  animateUiOpacity,
  animateUiProperty,
  animateUiScale,
} from './animate-ui-property.js';
import { destroyUiSubtree } from './destroy-ui-subtree.js';

// ── Shared option types ───────────────────────────────────────────────────────

/**
 * Common animation timing options shared by all presets.
 */
export interface UiAnimationOptions {
  /** Duration in milliseconds. Each preset has its own default. */
  duration?: number;
  /** Easing function. Each preset has its own default. */
  easing?: (t: number) => number;
  /** Called when the animation completes. */
  onFinished?: () => void;
}

/** Slide direction for {@link slideIn} and {@link slideOut}. */
export type UiSlideDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Options for {@link slideIn} and {@link slideOut}.
 */
export interface UiSlideOptions extends UiAnimationOptions {
  /**
   * Direction the element slides in from / slides out toward.
   * Default `'right'`.
   */
  direction?: UiSlideDirection;
  /**
   * Distance in pixels to slide. Defaults to `200`.
   */
  distance?: number;
}

// ── Fade ──────────────────────────────────────────────────────────────────────

/**
 * Animates `opacity` from `0` to `1` on the entity.
 *
 * @param world - The ECS world.
 * @param entity - Target entity (must have {@link UiRenderableEcsComponent}).
 * @param options - Optional timing overrides.
 */
export function fadeIn(
  world: EcsWorld,
  entity: number,
  options?: UiAnimationOptions,
): void {
  animateUiOpacity(world, entity, {
    from: 0,
    to: 1,
    duration: options?.duration ?? 200,
    easing: options?.easing,
    onFinished: options?.onFinished,
  });
}

/**
 * Animates `opacity` from its current value to `0` on the entity.
 *
 * @param world - The ECS world.
 * @param entity - Target entity (must have {@link UiRenderableEcsComponent}).
 * @param options - Optional timing overrides.
 */
export function fadeOut(
  world: EcsWorld,
  entity: number,
  options?: UiAnimationOptions,
): void {
  animateUiOpacity(world, entity, {
    to: 0,
    duration: options?.duration ?? 200,
    easing: options?.easing,
    onFinished: options?.onFinished,
  });
}

// ── Pop ───────────────────────────────────────────────────────────────────────

/**
 * Entrance animation: scales from `0` to `1` using `easeOutBack` (overshoot)
 * while fading in from `0` to `1`.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Optional timing overrides.
 */
export function popIn(
  world: EcsWorld,
  entity: number,
  options?: UiAnimationOptions,
): void {
  const duration = options?.duration ?? 250;
  const easing = options?.easing ?? easeOutBack;

  animateUiScale(world, entity, { from: 0, to: 1, duration, easing });
  animateUiOpacity(world, entity, {
    from: 0,
    to: 1,
    duration,
    onFinished: options?.onFinished,
  });
}

/**
 * Exit animation: scales from `1` to `0` using `easeInBack` (wind-up) while
 * fading out from `1` to `0`.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Optional timing overrides.
 */
export function popOut(
  world: EcsWorld,
  entity: number,
  options?: UiAnimationOptions,
): void {
  const duration = options?.duration ?? 200;
  const easing = options?.easing ?? easeInBack;

  animateUiScale(world, entity, { from: 1, to: 0, duration, easing });
  animateUiOpacity(world, entity, {
    from: 1,
    to: 0,
    duration,
    onFinished: options?.onFinished,
  });
}

// ── Slide ─────────────────────────────────────────────────────────────────────

/**
 * Entrance animation: translates the entity into its natural position from the
 * given direction by animating `offsetMin.x` or `offsetMin.y`.
 *
 * The element is repositioned to the start offset before the animation begins,
 * then animated back to its original (natural) position.
 *
 * @param world - The ECS world.
 * @param entity - Target entity (must have {@link UiTransformEcsComponent}).
 * @param options - Direction, distance, and timing overrides.
 */
export function slideIn(
  world: EcsWorld,
  entity: number,
  options?: UiSlideOptions,
): void {
  const transform = world.getComponent(entity, uiTransformId);

  if (!transform) {
    return;
  }

  const direction = options?.direction ?? 'right';
  const distance = options?.distance ?? 200;
  const duration = options?.duration ?? 300;
  const easing = options?.easing;

  const naturalX = transform.offsetMin.x;
  const naturalY = transform.offsetMin.y;

  if (direction === 'left') {
    transform.offsetMin.x = naturalX + distance;
    transform.isDirty = true;
    animateUiOffsetMinX(world, entity, {
      from: naturalX + distance,
      to: naturalX,
      duration,
      easing,
      onFinished: options?.onFinished,
    });
  } else if (direction === 'right') {
    transform.offsetMin.x = naturalX - distance;
    transform.isDirty = true;
    animateUiOffsetMinX(world, entity, {
      from: naturalX - distance,
      to: naturalX,
      duration,
      easing,
      onFinished: options?.onFinished,
    });
  } else if (direction === 'up') {
    transform.offsetMin.y = naturalY + distance;
    transform.isDirty = true;
    animateUiOffsetMinY(world, entity, {
      from: naturalY + distance,
      to: naturalY,
      duration,
      easing,
      onFinished: options?.onFinished,
    });
  } else {
    transform.offsetMin.y = naturalY - distance;
    transform.isDirty = true;
    animateUiOffsetMinY(world, entity, {
      from: naturalY - distance,
      to: naturalY,
      duration,
      easing,
      onFinished: options?.onFinished,
    });
  }
}

/**
 * Exit animation: translates the entity out of view in the given direction by
 * animating `offsetMin.x` or `offsetMin.y` away from the natural position.
 *
 * @param world - The ECS world.
 * @param entity - Target entity (must have {@link UiTransformEcsComponent}).
 * @param options - Direction, distance, and timing overrides.
 */
export function slideOut(
  world: EcsWorld,
  entity: number,
  options?: UiSlideOptions,
): void {
  const transform = world.getComponent(entity, uiTransformId);

  if (!transform) {
    return;
  }

  const direction = options?.direction ?? 'right';
  const distance = options?.distance ?? 200;
  const duration = options?.duration ?? 300;
  const easing = options?.easing;

  const currentX = transform.offsetMin.x;
  const currentY = transform.offsetMin.y;

  if (direction === 'left') {
    animateUiOffsetMinX(world, entity, {
      from: currentX,
      to: currentX - distance,
      duration,
      easing,
      onFinished: options?.onFinished,
    });
  } else if (direction === 'right') {
    animateUiOffsetMinX(world, entity, {
      from: currentX,
      to: currentX + distance,
      duration,
      easing,
      onFinished: options?.onFinished,
    });
  } else if (direction === 'up') {
    animateUiOffsetMinY(world, entity, {
      from: currentY,
      to: currentY - distance,
      duration,
      easing,
      onFinished: options?.onFinished,
    });
  } else {
    animateUiOffsetMinY(world, entity, {
      from: currentY,
      to: currentY + distance,
      duration,
      easing,
      onFinished: options?.onFinished,
    });
  }
}

// ── Scroll animation ──────────────────────────────────────────────────────────

/**
 * Smoothly animates the scroll position of a scroll group toward `target`.
 *
 * Uses the viewport entity as the animation host so the animations are tagged
 * (`ui.scroll.x` and `ui.scroll.y`) and can be cancelled/replaced on
 * subsequent calls.
 *
 * @param world - The ECS world.
 * @param viewportEntity - Entity with {@link UiScrollEcsComponent}.
 * @param target - Target scroll offset in pixels.
 * @param options - Optional timing overrides.
 */
export function animateScrollTo(
  world: EcsWorld,
  viewportEntity: number,
  target: Vector2,
  options?: UiAnimationOptions,
): void {
  const scrollComp = world.getComponent(viewportEntity, uiScrollId);

  if (!scrollComp) {
    return;
  }

  const duration = options?.duration ?? 300;
  const easing = options?.easing;

  const fromX = scrollComp.scroll.x;
  const fromY = scrollComp.scroll.y;

  animateUiProperty(world, viewportEntity, {
    tag: 'ui.scroll.x',
    from: fromX,
    to: target.x,
    duration,
    easing,
    updateCallback: (value) => {
      scrollComp.scroll.x = value;
    },
  });

  animateUiProperty(world, viewportEntity, {
    tag: 'ui.scroll.y',
    from: fromY,
    to: target.y,
    duration,
    easing,
    onFinished: options?.onFinished,
    updateCallback: (value) => {
      scrollComp.scroll.y = value;
    },
  });
}

// ── Exit + destroy ────────────────────────────────────────────────────────────

/**
 * Plays a fade-out animation and then destroys the entity subtree once it
 * completes, ensuring no entity is removed mid-animation.
 *
 * @param world - The ECS world.
 * @param entity - The root entity to animate then destroy.
 * @param options - Optional timing overrides (excluding `onFinished`).
 */
export function destroyWithFadeOut(
  world: EcsWorld,
  entity: number,
  options?: Omit<UiAnimationOptions, 'onFinished'>,
): void {
  fadeOut(world, entity, {
    ...options,
    onFinished: () => destroyUiSubtree(world, entity),
  });
}

/**
 * Plays a pop-out animation and then destroys the entity subtree once it
 * completes, ensuring no entity is removed mid-animation.
 *
 * @param world - The ECS world.
 * @param entity - The root entity to animate then destroy.
 * @param options - Optional timing overrides (excluding `onFinished`).
 */
export function destroyWithPopOut(
  world: EcsWorld,
  entity: number,
  options?: Omit<UiAnimationOptions, 'onFinished'>,
): void {
  popOut(world, entity, {
    ...options,
    onFinished: () => destroyUiSubtree(world, entity),
  });
}

/**
 * Plays a slide-out animation and then destroys the entity subtree once it
 * completes.
 *
 * @param world - The ECS world.
 * @param entity - The root entity to animate then destroy.
 * @param options - Slide direction, distance, and timing overrides (excluding `onFinished`).
 */
export function destroyWithSlideOut(
  world: EcsWorld,
  entity: number,
  options?: Omit<UiSlideOptions, 'onFinished'>,
): void {
  slideOut(world, entity, {
    ...options,
    onFinished: () => destroyUiSubtree(world, entity),
  });
}
