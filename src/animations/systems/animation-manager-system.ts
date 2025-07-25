import { Vector2 } from '../../math';
import { ImageAnimationComponent } from '../components';

export interface AnimationSet {
  animationFrames: AnimationFrame[];
  numFrames: number;
  nextAnimationSetName?: string; // if not set, repeats the current animation. Otherwise, switches to the next animation state
}

export interface AnimationFrame {
  offset: Vector2;
  scale: Vector2;
  durationSeconds: number;
}

export interface OptionalCreateAnimationSetParams {
  startPositionPercentage: Vector2;
  endPositionPercentage: Vector2;
  numFrames: number;
  nextAnimationSetName?: string;
}

export class SpriteAnimationManager {
  /* 
    Maps an entity type to a map of animation sets.
    The key is the entityType, and the value is a map where the key is the
    animation set name and the value is the AnimationSet.
    This allows for multiple animation sets per entity type, which can be useful
    for different animations that can be applied to the same entity type.
    */
  private readonly _entityAnimationSets: Map<
    string,
    Map<string, AnimationSet>
  > = new Map();

  public createAnimationSet(
    entityType: string,
    animationType: string,
    spritesPerColumn: number,
    spritesPerRow: number,
    animationFrameDurationSeconds: number | number[],
    options?: Partial<OptionalCreateAnimationSetParams>,
  ): void {
    const {
      startPositionPercentage,
      endPositionPercentage,
      numFrames,
      nextAnimationSetName: nextAnimationSetName,
    } = {
      startPositionPercentage: Vector2.zero,
      endPositionPercentage: Vector2.one,
      numFrames: spritesPerColumn * spritesPerRow,
      ...options,
    };

    if (
      Array.isArray(animationFrameDurationSeconds) &&
      animationFrameDurationSeconds.length !== numFrames
    ) {
      throw new Error(
        `Animation duration array length (${animationFrameDurationSeconds.length}) must be equal to the number of frames (${numFrames}).`,
      );
    }

    const animationFrames: AnimationFrame[] = [];
    const scale = new Vector2(
      (endPositionPercentage.x - startPositionPercentage.x) / spritesPerRow,
      (endPositionPercentage.y - startPositionPercentage.y) / spritesPerColumn,
    );

    for (let i = 0; i < numFrames; i++) {
      const row = Math.floor(i / spritesPerRow);
      const col = i % spritesPerRow;
      animationFrames.push({
        offset: new Vector2(
          startPositionPercentage.x + col * scale.x,
          startPositionPercentage.y + row * scale.y,
        ),
        scale,
        durationSeconds: Array.isArray(animationFrameDurationSeconds)
          ? animationFrameDurationSeconds[i]
          : animationFrameDurationSeconds,
      });
    }

    const animationSet: AnimationSet = {
      animationFrames: animationFrames,
      numFrames,
      nextAnimationSetName,
    };

    const currentAnimations =
      this._entityAnimationSets.get(entityType) ??
      new Map<string, AnimationSet>();
    this._entityAnimationSets.set(entityType, currentAnimations);

    currentAnimations.set(animationType, animationSet);
  }

  public getAnimationSet(
    entityType: string,
    animationType: string,
  ): AnimationSet | null {
    return (
      this._entityAnimationSets.get(entityType)?.get(animationType) ?? null
    );
  }

  public getAnimationFrame(
    imageAnimationComponent: ImageAnimationComponent | null,
  ): AnimationFrame | null {
    if (!imageAnimationComponent) {
      return null;
    }

    const entityType = imageAnimationComponent.entityType;
    const animationType = imageAnimationComponent.currentAnimation;
    const frameIndex = imageAnimationComponent.animationIndex;

    const animationSet = this.getAnimationSet(entityType, animationType);

    if (!animationSet) {
      throw new Error(
        `No animation set found for entity type: ${entityType}, animation: ${animationType}`,
      );
    }

    const imageAnimationFrames = animationSet.animationFrames;

    return imageAnimationFrames[frameIndex];
  }
}
