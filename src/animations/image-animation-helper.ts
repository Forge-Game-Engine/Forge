import { ImageAnimationComponent } from './components';

export function onAnimationEnd(
  imageAnimationComponent: ImageAnimationComponent,
): void {
  imageAnimationComponent.animationIndex = 0;
  imageAnimationComponent.isChangingAnimation = true;
}

export function setCurrentAnimation(
  imageAnimationComponent: ImageAnimationComponent,
  animation: string,
): void {
  imageAnimationComponent.nextAnimationSetName = null;
  imageAnimationComponent.currentAnimationSetName = animation;
  onAnimationEnd(imageAnimationComponent);
}

export function nextAnimation(
  imageAnimationComponent: ImageAnimationComponent,
): void {
  if (!imageAnimationComponent.nextAnimationSetName) {
    throw new Error(
      `No next animation set name specified for entity type "${imageAnimationComponent.entityType}" with current animation "${imageAnimationComponent.currentAnimationSetName}". ` +
        'Set the nextAnimationSetName property on imageAnimationComponent component instance, or use setCurrentAnimation() to set the next animation.',
    );
  }

  setCurrentAnimation(
    imageAnimationComponent,
    imageAnimationComponent.nextAnimationSetName,
  );
}
