import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Fields of {@link SpriteAnimationEcsComponent} with no sensible default;
 * callers must always provide these.
 */
export interface SpriteAnimationRequiredOptions {
  /**
   * Handle for the active `AnimationClip` in the `AssetRegistry` passed to `createSpriteAnimationEcsSystem`.
   */
  animationClipHandle: number;
}

/**
 * Fields of {@link SpriteAnimationEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface SpriteAnimationDefaultedOptions {
  /**
   * The index of the currently displayed frame within the active animation clip.
   */
  animationFrameIndex: number;

  /**
   * Multiplier applied to `frameDurationMilliseconds`. Values greater than 1 play the animation faster and values between 0 and 1 play it slower. Must be greater than 0.
   */
  playbackSpeed: number;

  /**
   * How long each frame is displayed, in milliseconds, before `playbackSpeed` is applied. Must be greater than 0.
   */
  frameDurationMilliseconds: number;

  /**
   * The `Time.timeInSeconds` value when the displayed frame last changed. Updated automatically by `createSpriteAnimationEcsSystem`.
   */
  lastFrameChangeTimeInSeconds: number;
}

/**
 * ECS-style component interface for sprite animations.
 */
export interface SpriteAnimationEcsComponent
  extends SpriteAnimationRequiredOptions, SpriteAnimationDefaultedOptions {}

/**
 * Component key for {@link SpriteAnimationEcsComponent}.
 */
export const spriteAnimationId =
  createComponentId<SpriteAnimationEcsComponent>('sprite-animation');

const defaultSpriteAnimationOptions: SpriteAnimationDefaultedOptions = {
  animationFrameIndex: 0,
  playbackSpeed: 1,
  frameDurationMilliseconds: 100,
  lastFrameChangeTimeInSeconds: 0,
};

/**
 * Attaches a {@link SpriteAnimationEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the sprite animation.
 * `animationClipHandle` has no sensible default and must always be
 * provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addSpriteAnimationComponent(
  world: EcsWorld,
  entity: number,
  options: SpriteAnimationRequiredOptions &
    Partial<SpriteAnimationEcsComponent>,
): SpriteAnimationEcsComponent {
  const component: SpriteAnimationEcsComponent = {
    ...defaultSpriteAnimationOptions,
    ...options,
  };

  return world.addComponent(entity, spriteAnimationId, component);
}
