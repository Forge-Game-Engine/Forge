import {
  animationId,
  createAnimatedProperty,
  type LoopMode,
} from '../../animations/components/animation-component.js';
import { Color } from '../../rendering/color.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { uiRenderableId } from '../components/ui-renderable-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';

/**
 * Options for the core {@link animateUiProperty} helper.
 *
 * The `tag` field is used to cancel or replace any in-flight animation on the
 * same entity that was started with the same tag — preventing stacking when
 * rapid state changes trigger the same property animation multiple times.
 */
export interface AnimateUiPropertyOptions {
  /** Identifier used for cancel/replace. Leave empty to skip cancellation. */
  tag?: string;
  /** Starting value. Defaults to `animationDefaults.startValue` (0). */
  from?: number;
  /** Target value. */
  to: number;
  /** Duration in milliseconds. */
  duration: number;
  /** Easing function. Defaults to `linear`. */
  easing?: (t: number) => number;
  /** Loop mode. Defaults to `'none'`. */
  loop?: LoopMode;
  /** Loop count. `-1` means indefinite. Defaults to `-1`. */
  loopCount?: number;
  /** Called once when the animation completes (not called when cancelled). */
  onFinished?: () => void;
  /** Receives the current interpolated value each frame. */
  updateCallback: (value: number) => void;
}

/**
 * Scalar animation options shared by all typed UI animation wrappers.
 */
export interface UiScalarAnimationOptions {
  /** Starting value. When omitted the wrapper reads the current component value. */
  from?: number;
  /** Target value. */
  to: number;
  /** Duration in milliseconds. */
  duration: number;
  /** Easing function. Defaults to `linear`. */
  easing?: (t: number) => number;
  /** Loop mode. Defaults to `'none'`. */
  loop?: LoopMode;
  /** Loop count. `-1` means indefinite. Defaults to `-1`. */
  loopCount?: number;
  /** Called once when the animation completes. */
  onFinished?: () => void;
}

/**
 * Color animation options for {@link animateUiTintColor} and
 * {@link animateUiBorderColor}.
 */
export interface UiColorAnimationOptions {
  /**
   * Starting color. When omitted the wrapper reads the current component value.
   */
  from?: Color;
  /** Target color. */
  to: Color;
  /** Duration in milliseconds. */
  duration: number;
  /** Easing function. Defaults to `linear`. */
  easing?: (t: number) => number;
  /** Called once when the animation completes. */
  onFinished?: () => void;
}

// ── Core helper ───────────────────────────────────────────────────────────────

/**
 * Cancels any in-flight animation with the given tag on `entity`.
 *
 * Animations without a tag (or with `tag === ''`) are never matched.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param tag - The tag to cancel.
 */
export function cancelUiPropertyAnimation(
  world: EcsWorld,
  entity: number,
  tag: string,
): void {
  if (!tag) {
    return;
  }

  const animComp = world.getComponent(entity, animationId);

  if (!animComp) {
    return;
  }

  for (let i = animComp.animations.length - 1; i >= 0; i--) {
    if (animComp.animations[i].tag === tag) {
      animComp.animations.splice(i, 1);
    }
  }
}

/**
 * Pushes a new `AnimatedProperty` onto the entity's `AnimationEcsComponent`,
 * creating the component when it is absent.
 *
 * If `options.tag` is provided, any existing animation with that tag is
 * cancelled before the new one is pushed, preventing stacking.
 *
 * The `updateCallback` is responsible for writing the interpolated value into
 * the relevant component field and setting any required dirty flags.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options.
 */
export function animateUiProperty(
  world: EcsWorld,
  entity: number,
  options: AnimateUiPropertyOptions,
): void {
  if (options.tag) {
    cancelUiPropertyAnimation(world, entity, options.tag);
  }

  let animComp = world.getComponent(entity, animationId);

  if (!animComp) {
    animComp = world.addComponent(entity, animationId, { animations: [] });
  }

  const animation = createAnimatedProperty({
    startValue: options.from,
    endValue: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    finishedCallback: options.onFinished,
    updateCallback: options.updateCallback,
    tag: options.tag,
  });

  animComp.animations.push(animation);
}

// ── Renderable (visual) wrappers ──────────────────────────────────────────────

/**
 * Animates the `opacity` field of the entity's {@link UiRenderableEcsComponent}.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current opacity.
 */
export function animateUiOpacity(
  world: EcsWorld,
  entity: number,
  options: UiScalarAnimationOptions,
): void {
  const renderable = world.getComponent(entity, uiRenderableId);

  if (!renderable) {
    return;
  }

  animateUiProperty(world, entity, {
    tag: 'ui.opacity',
    from: options.from ?? renderable.opacity,
    to: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    onFinished: options.onFinished,
    updateCallback: (value) => {
      renderable.opacity = value;
    },
  });
}

/**
 * Animates the `cornerRadius` field of the entity's
 * {@link UiRenderableEcsComponent}.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current corner radius.
 */
export function animateUiCornerRadius(
  world: EcsWorld,
  entity: number,
  options: UiScalarAnimationOptions,
): void {
  const renderable = world.getComponent(entity, uiRenderableId);

  if (!renderable) {
    return;
  }

  animateUiProperty(world, entity, {
    tag: 'ui.cornerRadius',
    from: options.from ?? renderable.cornerRadius,
    to: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    onFinished: options.onFinished,
    updateCallback: (value) => {
      renderable.cornerRadius = value;
    },
  });
}

/**
 * Animates the `borderWidth` field of the entity's
 * {@link UiRenderableEcsComponent}.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current border width.
 */
export function animateUiBorderWidth(
  world: EcsWorld,
  entity: number,
  options: UiScalarAnimationOptions,
): void {
  const renderable = world.getComponent(entity, uiRenderableId);

  if (!renderable) {
    return;
  }

  animateUiProperty(world, entity, {
    tag: 'ui.borderWidth',
    from: options.from ?? renderable.borderWidth,
    to: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    onFinished: options.onFinished,
    updateCallback: (value) => {
      renderable.borderWidth = value;
    },
  });
}

/**
 * Animates the `tintColor` field of the entity's
 * {@link UiRenderableEcsComponent} by lerping between two {@link Color} values
 * using a single 0→1 driver.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current tint color.
 */
export function animateUiTintColor(
  world: EcsWorld,
  entity: number,
  options: UiColorAnimationOptions,
): void {
  const renderable = world.getComponent(entity, uiRenderableId);

  if (!renderable) {
    return;
  }

  const fromColor = options.from ?? renderable.tintColor;
  const toColor = options.to;

  animateUiProperty(world, entity, {
    tag: 'ui.tintColor',
    from: 0,
    to: 1,
    duration: options.duration,
    easing: options.easing,
    onFinished: options.onFinished,
    updateCallback: (t) => {
      renderable.tintColor = Color.lerp(fromColor, toColor, t);
    },
  });
}

/**
 * Animates the `borderColor` field of the entity's
 * {@link UiRenderableEcsComponent} by lerping between two {@link Color} values.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current border color.
 */
export function animateUiBorderColor(
  world: EcsWorld,
  entity: number,
  options: UiColorAnimationOptions,
): void {
  const renderable = world.getComponent(entity, uiRenderableId);

  if (!renderable) {
    return;
  }

  const fromColor = options.from ?? renderable.borderColor;
  const toColor = options.to;

  animateUiProperty(world, entity, {
    tag: 'ui.borderColor',
    from: 0,
    to: 1,
    duration: options.duration,
    easing: options.easing,
    onFinished: options.onFinished,
    updateCallback: (t) => {
      renderable.borderColor = Color.lerp(fromColor, toColor, t);
    },
  });
}

// ── Transform wrappers ────────────────────────────────────────────────────────

/**
 * Animates both `scale.x` and `scale.y` uniformly on the entity's
 * {@link UiTransformEcsComponent}, marking the transform dirty each frame.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current scale X.
 */
export function animateUiScale(
  world: EcsWorld,
  entity: number,
  options: UiScalarAnimationOptions,
): void {
  const transform = world.getComponent(entity, uiTransformId);

  if (!transform) {
    return;
  }

  animateUiProperty(world, entity, {
    tag: 'ui.scale',
    from: options.from ?? transform.scale.x,
    to: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    onFinished: options.onFinished,
    updateCallback: (value) => {
      transform.scale.x = value;
      transform.scale.y = value;
      transform.isDirty = true;
    },
  });
}

/**
 * Animates `scale.x` on the entity's {@link UiTransformEcsComponent}.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current scale X.
 */
export function animateUiScaleX(
  world: EcsWorld,
  entity: number,
  options: UiScalarAnimationOptions,
): void {
  const transform = world.getComponent(entity, uiTransformId);

  if (!transform) {
    return;
  }

  animateUiProperty(world, entity, {
    tag: 'ui.scale.x',
    from: options.from ?? transform.scale.x,
    to: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    onFinished: options.onFinished,
    updateCallback: (value) => {
      transform.scale.x = value;
      transform.isDirty = true;
    },
  });
}

/**
 * Animates `scale.y` on the entity's {@link UiTransformEcsComponent}.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current scale Y.
 */
export function animateUiScaleY(
  world: EcsWorld,
  entity: number,
  options: UiScalarAnimationOptions,
): void {
  const transform = world.getComponent(entity, uiTransformId);

  if (!transform) {
    return;
  }

  animateUiProperty(world, entity, {
    tag: 'ui.scale.y',
    from: options.from ?? transform.scale.y,
    to: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    onFinished: options.onFinished,
    updateCallback: (value) => {
      transform.scale.y = value;
      transform.isDirty = true;
    },
  });
}

/**
 * Animates the `rotation` (radians) on the entity's
 * {@link UiTransformEcsComponent}.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current rotation.
 */
export function animateUiRotation(
  world: EcsWorld,
  entity: number,
  options: UiScalarAnimationOptions,
): void {
  const transform = world.getComponent(entity, uiTransformId);

  if (!transform) {
    return;
  }

  animateUiProperty(world, entity, {
    tag: 'ui.rotation',
    from: options.from ?? transform.rotation,
    to: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    onFinished: options.onFinished,
    updateCallback: (value) => {
      transform.rotation = value;
      transform.isDirty = true;
    },
  });
}

/**
 * Animates the `offsetMin.x` field of the entity's
 * {@link UiTransformEcsComponent}.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current offsetMin.x.
 */
export function animateUiOffsetMinX(
  world: EcsWorld,
  entity: number,
  options: UiScalarAnimationOptions,
): void {
  const transform = world.getComponent(entity, uiTransformId);

  if (!transform) {
    return;
  }

  animateUiProperty(world, entity, {
    tag: 'ui.offsetMin.x',
    from: options.from ?? transform.offsetMin.x,
    to: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    onFinished: options.onFinished,
    updateCallback: (value) => {
      transform.offsetMin.x = value;
      transform.isDirty = true;
    },
  });
}

/**
 * Animates the `offsetMin.y` field of the entity's
 * {@link UiTransformEcsComponent}.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current offsetMin.y.
 */
export function animateUiOffsetMinY(
  world: EcsWorld,
  entity: number,
  options: UiScalarAnimationOptions,
): void {
  const transform = world.getComponent(entity, uiTransformId);

  if (!transform) {
    return;
  }

  animateUiProperty(world, entity, {
    tag: 'ui.offsetMin.y',
    from: options.from ?? transform.offsetMin.y,
    to: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    onFinished: options.onFinished,
    updateCallback: (value) => {
      transform.offsetMin.y = value;
      transform.isDirty = true;
    },
  });
}

/**
 * Animates the `offsetMax.x` field of the entity's
 * {@link UiTransformEcsComponent}.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current offsetMax.x.
 */
export function animateUiOffsetMaxX(
  world: EcsWorld,
  entity: number,
  options: UiScalarAnimationOptions,
): void {
  const transform = world.getComponent(entity, uiTransformId);

  if (!transform) {
    return;
  }

  animateUiProperty(world, entity, {
    tag: 'ui.offsetMax.x',
    from: options.from ?? transform.offsetMax.x,
    to: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    onFinished: options.onFinished,
    updateCallback: (value) => {
      transform.offsetMax.x = value;
      transform.isDirty = true;
    },
  });
}

/**
 * Animates the `offsetMax.y` field of the entity's
 * {@link UiTransformEcsComponent}.
 *
 * @param world - The ECS world.
 * @param entity - Target entity.
 * @param options - Animation options. `from` defaults to the current offsetMax.y.
 */
export function animateUiOffsetMaxY(
  world: EcsWorld,
  entity: number,
  options: UiScalarAnimationOptions,
): void {
  const transform = world.getComponent(entity, uiTransformId);

  if (!transform) {
    return;
  }

  animateUiProperty(world, entity, {
    tag: 'ui.offsetMax.y',
    from: options.from ?? transform.offsetMax.y,
    to: options.to,
    duration: options.duration,
    easing: options.easing,
    loop: options.loop,
    loopCount: options.loopCount,
    onFinished: options.onFinished,
    updateCallback: (value) => {
      transform.offsetMax.y = value;
      transform.isDirty = true;
    },
  });
}
