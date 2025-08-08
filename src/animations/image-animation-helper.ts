import { SpriteAnimationComponent } from './';

export function onAnimationEnd(
  spriteAnimationComponent: SpriteAnimationComponent,
): void {
  spriteAnimationComponent.animationIndex = 0;
  spriteAnimationComponent.isChangingAnimation = true;
}

export function setCurrentAnimation(
  spriteAnimationComponent: SpriteAnimationComponent,
  animation: string,
): void {
  spriteAnimationComponent.nextAnimationSetName = null;
  spriteAnimationComponent.currentAnimationSetName = animation;
  onAnimationEnd(spriteAnimationComponent);
}

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
