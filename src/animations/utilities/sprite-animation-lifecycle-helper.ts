import { SpriteAnimationComponent } from '../components';

/**
 * Function to be called at the end of a sprite animation, to set it up for the next animation
 * @param spriteAnimationComponent - the sprite animation component to act on
 */
export function finishAnimation(
  spriteAnimationComponent: SpriteAnimationComponent,
): void {
  spriteAnimationComponent.animationIndex = 0;
  spriteAnimationComponent.isChangingAnimation = true;
}

/**
 * Function to immediately set the current animation of a sprite animation
 * If the sprite animation component had a next animation assigned, that next animation will be ignored and removed
 * @param spriteAnimationComponent - the sprite animation component to act on
 * @param animationName - the name of the next animation to run
 */
export function immediatelySetCurrentAnimation(
  spriteAnimationComponent: SpriteAnimationComponent,
  animationName: string,
): void {
  spriteAnimationComponent.nextAnimationName = null;
  spriteAnimationComponent.animationName = animationName;
  finishAnimation(spriteAnimationComponent);
}
