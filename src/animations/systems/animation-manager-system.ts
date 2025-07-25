import { Vector2 } from '../../math';
import { ImageAnimationComponent } from '../components';

/**
 * Interface representing a set of animation frames for a specific animation type.
 */
export interface AnimationSet {
  /**
   * The frames of the animation.
   */
  animationFrames: AnimationFrame[];
  /**
   * The total number of frames in the animation.
   */
  numFrames: number;
  /**
   * The name of the next animation set to switch to after this animation completes.
   * If not set, the animation will repeat by default.
   */
  nextAnimationSetName: string | null;
}

/**
 * Interface representing a single frame of an animation.
 */
export interface AnimationFrame {
  /**
   * The offset of the frame in the sprite sheet, scaled from 0 to 1.
   * This is a percentage of the total sprite sheet dimensions.
   */
  offset: Vector2;
  /**
   * The scale of the frame, which determines how it is rendered, scaled from 0 to 1.
   * This is a percentage of the total sprite sheet dimensions.
   */
  scale: Vector2;
  /**
   * The duration of the frame in seconds.
   */
  durationSeconds: number;
}

/**
 * Optional parameters for creating an animation set.
 */
export interface OptionalCreateAnimationSetParams {
  /**
   * The starting position of the animation frames in the sprite sheet, as a percentage.
   * @default (0, 0).
   */
  startPositionPercentage: Vector2;
  /**
   * The ending position of the animation frames in the sprite sheet, as a percentage.
   * @default (1, 1).
   */
  endPositionPercentage: Vector2;
  /**
   * The total number of frames in the animation.
   * @default calculated from spritesPerColumn and spritesPerRow.
   */
  numFrames: number;
  /**
   * The name of the next animation set to switch to after this animation completes.
   * If not set, the animation will repeat by default.
   */
  nextAnimationSetName: string | null;
}

/**
 * Manages sprite animations for all entities, allowing for the creation and retrieval of animation sets.
 */
export class SpriteAnimationManager {
  /**
   * Maps an entity type to a map of animation sets.
   * The key is the entityType, and the value is a map where the key is the
   * animation set name and the value is the AnimationSet.
   * This allows for multiple animation sets per entity type.
   * @default new Map()
   */
  private readonly _entityAnimationSets: Map<
    string,
    Map<string, AnimationSet>
  > = new Map();

  /**
   * @param entityType - The type of the entity for which the animation set is being created.
   * @param animationType - The type of animation (e.g., 'walk', 'run').
   * @param spritesPerColumn - The number of sprites in each column of the sprite sheet.
   * @param spritesPerRow - The number of sprites in each row of the sprite sheet.
   * @param animationFrameDurationSeconds - The duration of each animation frame in seconds.
   * This can be a single number for all frames or an array of numbers for each frame. If an array is provided,
   * its length must match the total number of frames.
   * @param options - Optional parameters for creating the animation set.
   */
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
      nextAnimationSetName: null,
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

  /**
   * Retrieves the animation set for a given entity type and animation type.
   * @param entityType - The type of the entity.
   * @param animationType - The type of animation (e.g., 'walk', 'run').
   * @returns The AnimationSet if found, or null if not found.
   */
  public getAnimationSet(
    entityType: string,
    animationType: string,
  ): AnimationSet | null {
    return (
      this._entityAnimationSets.get(entityType)?.get(animationType) ?? null
    );
  }

  /**
   * Retrieves the current animation frame for a given ImageAnimationComponent.
   * @param imageAnimationComponent - The ImageAnimationComponent to get the current frame for.
   * @returns The current AnimationFrame or null if the component is not provided.
   */
  public getAnimationFrame(
    imageAnimationComponent: ImageAnimationComponent | null,
  ): AnimationFrame | null {
    if (!imageAnimationComponent) {
      return null;
    }

    const entityType = imageAnimationComponent.entityType;
    const animationType = imageAnimationComponent.currentAnimationSetName;
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
