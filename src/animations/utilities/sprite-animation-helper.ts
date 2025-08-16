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
  spriteAnimationComponent.currentAnimationName = animationName;
  finishAnimation(spriteAnimationComponent);
}

/**
 * Function to make the sprite animation component go to its next animation that it was assigned
 * @param spriteAnimationComponent - the sprite animation component to act on
 */
export function goToNextAnimation(
  spriteAnimationComponent: SpriteAnimationComponent,
): void {
  if (!spriteAnimationComponent.nextAnimationName) {
    throw new Error(
      `No next animation name specified for animation set "${spriteAnimationComponent.animationSetName}" with current animation name "${spriteAnimationComponent.currentAnimationName}". 
        Set the nextAnimationName property on spriteAnimationComponent component instance, or use setCurrentAnimation() to set the next animation.`,
    );
  }

  immediatelySetCurrentAnimation(
    spriteAnimationComponent,
    spriteAnimationComponent.nextAnimationName,
  );
}
