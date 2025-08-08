import { Entity } from '../../ecs';
import { ParameterizedForgeEvent } from '../../events';
import { Vector2 } from '../../math';
import { SpriteAnimationComponent } from '../components';

export type AnimationCallback = (entity: Entity) => void;
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
  /**
   * Map of callbacks to run at specific frames of the animation.
   * The key is the frame index, and the value is the callback function.
   */
  animationCallbacks: Map<number, ParameterizedForgeEvent<Entity>>;
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
   * @default null
   */
  nextAnimationSetName: string | null;

  /**
   * Callback functions to run at specific percentage points of the animation.
   * percentage is a number between 0 and 1, representing the progress of the animation.
   * percentage = 0 means the first frame of the animation, and percentage = 1 means the last frame of the animation.
   * @default []
   */
  animationCallbacks: Array<{
    percentage: number;
    callback: AnimationCallback;
  }>;
}

type AnimationCallbackData = {
  percentage: number;
  callback: AnimationCallback;
};

const defaultCreateAnimationSetParams: OptionalCreateAnimationSetParams = {
  startPositionPercentage: Vector2.zero,
  endPositionPercentage: Vector2.one,
  numFrames: 0, // This will be calculated based on spritesPerColumn and spritesPerRow
  nextAnimationSetName: null,
  animationCallbacks: [],
};

/**
 * Manages sprite animations for all entities, allowing for the creation and retrieval of animation sets.
 */
export class AnimationSetManager {
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
      nextAnimationSetName,
      animationCallbacks,
    } = {
      ...defaultCreateAnimationSetParams,
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

    const spriteUVSize = new Vector2(
      (endPositionPercentage.x - startPositionPercentage.x) / spritesPerRow,
      (endPositionPercentage.y - startPositionPercentage.y) / spritesPerColumn,
    );

    const animationFrames: AnimationFrame[] = this._generateAnimationFrames(
      numFrames,
      spritesPerRow,
      startPositionPercentage,
      spriteUVSize,
      animationFrameDurationSeconds,
    );

    const animationCallbacksMap = this._setupAnimationCallbacks(
      animationCallbacks,
      numFrames,
    );

    const animationSet: AnimationSet = {
      animationFrames: animationFrames,
      numFrames,
      nextAnimationSetName,
      animationCallbacks: animationCallbacksMap,
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
   * Retrieves the current animation frame for a given SpriteAnimationComponent.
   * @param spriteAnimationComponent - The SpriteAnimationComponent to get the current frame for.
   * @returns The current AnimationFrame or null if the component is not provided.
   */
  public getAnimationFrame(
    spriteAnimationComponent: SpriteAnimationComponent | null,
  ): AnimationFrame | null {
    if (!spriteAnimationComponent) {
      return null;
    }

    const { entityType, currentAnimationSetName, animationIndex } =
      spriteAnimationComponent;

    const animationSet = this.getAnimationSet(
      entityType,
      currentAnimationSetName,
    );

    if (!animationSet) {
      throw new Error(
        `No animation set found for entity type: ${entityType}, animation: ${currentAnimationSetName}`,
      );
    }

    const { animationFrames } = animationSet;

    return animationFrames[animationIndex];
  }

  /**
   * Generates animation frames based on the provided parameters.
   * @param numFrames - The total number of frames in the animation.
   * @param spritesPerRow - The number of sprites in each row of the sprite sheet.
   * @param startPositionPercentage - The starting position of the animation frames in the sprite sheet, as a percentage.
   * @param spriteUVSize - The scale of each sprite in the spritesheet, as a percentage.
   * @param animationFrameDurationSeconds - The duration of each animation frame in seconds.
   * This can be a single number for all frames or an array of numbers for each frame.
   * @returns An array of AnimationFrame objects.
   */
  private _generateAnimationFrames(
    numFrames: number,
    spritesPerRow: number,
    startPositionPercentage: Vector2,
    spriteUVSize: Vector2,
    animationFrameDurationSeconds: number | number[],
  ) {
    const animationFrames: AnimationFrame[] = [];

    for (let i = 0; i < numFrames; i++) {
      const row = Math.floor(i / spritesPerRow);
      const col = i % spritesPerRow;
      animationFrames.push({
        offset: new Vector2(
          startPositionPercentage.x + col * spriteUVSize.x,
          startPositionPercentage.y + row * spriteUVSize.y,
        ),
        scale: spriteUVSize,
        durationSeconds: Array.isArray(animationFrameDurationSeconds)
          ? animationFrameDurationSeconds[i]
          : animationFrameDurationSeconds,
      });
    }

    return animationFrames;
  }

  /**
   * Sets up animation callbacks based on the provided parameters.
   * @param animationCallbacks - An array of objects containing percentage and callback.
   * @param numFrames - The total number of frames in the animation.
   * @returns A Map where the key is the frame index and the value is the callback function.
   */
  private _setupAnimationCallbacks(
    animationCallbacks: AnimationCallbackData[],
    numFrames: number,
  ) {
    const animationCallbacksMap = new Map<
      number,
      ParameterizedForgeEvent<Entity>
    >();

    for (const { percentage, callback } of animationCallbacks) {
      if (percentage < 0 || percentage > 1) {
        throw new Error(
          `Invalid Percentage: percentage ${percentage} must be between 0 and 1.`,
        );
      }

      const frameIndex = Math.round(percentage * (numFrames - 1));

      const event =
        animationCallbacksMap.get(frameIndex) ??
        new ParameterizedForgeEvent<Entity>(frameIndex.toString());

      event.registerListener(callback);

      animationCallbacksMap.set(frameIndex, event);
    }

    return animationCallbacksMap;
  }
}
