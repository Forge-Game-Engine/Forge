import { SpriteAnimationComponent } from '.';

/**
 * Function to be called at the end of a sprite animation, to set it up for the next animation
 * @param spriteAnimationComponent - the sprite animation component to act on
 */
export function onAnimationEnd(
  spriteAnimationComponent: SpriteAnimationComponent,
): void {
  spriteAnimationComponent.animationIndex = 0;
  spriteAnimationComponent.isChangingAnimation = true;
}

/**
 * Function to immediately set the current animation of a sprite animation
 * @param spriteAnimationComponent - the sprite animation component to act on
 * @param animation - the name of the next animation to run
 */
export function setCurrentAnimation(
  spriteAnimationComponent: SpriteAnimationComponent,
  animation: string,
): void {
  spriteAnimationComponent.nextAnimationSetName = null;
  spriteAnimationComponent.currentAnimationSetName = animation;
  onAnimationEnd(spriteAnimationComponent);
}

/**
 * Function to make the sprite animation component go to its next animation, set from `nextAnimationSetName`
 * @param spriteAnimationComponent - the sprite animation component to act on
 */
export function nextAnimation(
  spriteAnimationComponent: SpriteAnimationComponent,
): void {
  if (!spriteAnimationComponent.nextAnimationSetName) {
    throw new Error(
      `No next animation set name specified for entity type "${spriteAnimationComponent.entityType}" with current animation "${spriteAnimationComponent.currentAnimationSetName}". ` +
        'Set the nextAnimationSetName property on spriteAnimationComponent component instance, or use setCurrentAnimation() to set the next animation.',
    );
  }

  setCurrentAnimation(
    spriteAnimationComponent,
    spriteAnimationComponent.nextAnimationSetName,
  );
}
