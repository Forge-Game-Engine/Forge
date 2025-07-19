import { Vector2 } from '../../math';

export interface AnimationSet {
  animationFrames: AnimationFrame[];
  numFrames: number;
  nextAnimationState?: string; // if not set, repeats the current animation. Otherwise, switches to the next animation state
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
  nextAnimationState?: string;
}
export class AnimationManager {
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
  constructor() {}

  // takes in a single duration, or an array for each frame

  public createAnimationSet(
    entityType: string,
    animationType: string,
    spritesPerColumn: number,
    spritesPerRow: number,
    animationDurationSeconds: number | number[],
    options?: Partial<OptionalCreateAnimationSetParams>,
  ): void {
    const {
      startPositionPercentage,
      endPositionPercentage,
      numFrames,
      nextAnimationState,
    } = {
      startPositionPercentage: new Vector2(0, 0),
      endPositionPercentage: new Vector2(1, 1),
      numFrames: spritesPerColumn * spritesPerRow,
      ...options,
    };

    if (
      Array.isArray(animationDurationSeconds) &&
      animationDurationSeconds.length != numFrames
    ) {
      console.error(
        `Animation duration array length (${animationDurationSeconds.length}) must be equal to the number of frames (${numFrames}).`,
      );

      return;
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
        scale: scale,
        durationSeconds: Array.isArray(animationDurationSeconds)
          ? animationDurationSeconds[i % animationDurationSeconds.length]
          : animationDurationSeconds,
      });
    }

    const animationSet: AnimationSet = {
      animationFrames: animationFrames,
      numFrames,
      nextAnimationState,
    };

    let currentAnimations = this._entityAnimationSets.get(entityType);

    if (!currentAnimations) {
      currentAnimations = new Map();
      this._entityAnimationSets.set(entityType, currentAnimations);
    }

    this._entityAnimationSets.set(
      entityType,
      currentAnimations.set(animationType, animationSet),
    );
  }

  public getAnimationSet(
    entityType: string,
    animationType: string,
  ): AnimationSet | undefined {
    return this._entityAnimationSets.get(entityType)?.get(animationType);
  }

  public getAnimationFrame(
    entityType?: string,
    animationType?: string,
    frameIndex?: number,
  ): AnimationFrame | undefined {
    if (!entityType || !animationType || frameIndex === undefined) {
      return {} as AnimationFrame;
    }

    const animationSet = this.getAnimationSet(entityType, animationType);

    if (!animationSet) {
      console.warn(
        `No animation set found for entity type: ${entityType}, animation: ${animationType}`,
      );

      return undefined;
    }

    const imageAnimationFrames = animationSet.animationFrames;

    return imageAnimationFrames[frameIndex];
  }
}
