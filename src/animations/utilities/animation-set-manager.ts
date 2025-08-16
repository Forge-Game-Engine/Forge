import { Entity } from '../../ecs';
import { ParameterizedForgeEvent } from '../../events';
import { Vector2 } from '../../math';
import { SpriteAnimationComponent } from '../components';

/**
 * Interface representing a group of animation frames for a specific animation name.
 */
export interface Animation {
  /**
   * The name of this animation.
   */
  animationName: string;
  /**
   * The frames of the animation.
   */
  frames: AnimationFrame[];
  /**
   * The name of the next animation to switch to after this animation completes.
   * If not set, this animation will repeat by default.
   */
  nextAnimationName: string | null;
  /**
   * Map of events to run at specific frames of the animation.
   * The key is the frame index, and the value is the forge event to be raised.
   */
  animationEvents: AnimationEventData;
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
 * Optional parameters for creating an animation.
 */
export interface AnimationCreationParams {
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
   * The name of the next animation to switch to after this animation completes.
   * If not set, the animation will repeat by default.
   * @default null
   */
  nextAnimationName: string | null;

  /**
   * Callback functions to run at specific frames of the animation.
   * frame is a number between 0 and numFrames - 1, representing the current frame of the animation.
   * frames must be whole numbers, and zero indexed
   * @default new Map()
   */
  animationEvents: AnimationEventData;
}

export type AnimationEventData = Map<number, ParameterizedForgeEvent<Entity>>;

const defaultCreateAnimationSetParams: AnimationCreationParams = {
  startPositionPercentage: Vector2.zero,
  endPositionPercentage: Vector2.one,
  numFrames: 0, // This will be calculated based on spritesPerColumn and spritesPerRow
  nextAnimationName: null,
  animationEvents: new Map(),
};

/**
 * Manages sprite animations for all entities, allowing for the creation and retrieval of animation sets.
 */
export class AnimationSetManager {
  /**
   * Maps an animation set name to a map of animations.
   * The key is the animationSetName, and the value is a map where the key is the
   * animationName and the value is the Animation.
   * @default new Map()
   */
  private readonly _animationSets: Map<string, Map<string, Animation>> =
    new Map();

  /**
   * @param animationSetName - The name of the animation set being created.
   * @param animationName - The name of the animation (e.g., 'walk', 'run').
   * @param spritesPerColumn - The number of sprites in each column of the sprite sheet.
   * @param spritesPerRow - The number of sprites in each row of the sprite sheet.
   * @param animationFrameDurationSeconds - The duration of each animation frame in seconds.
   * This can be a single number for all frames or an array of numbers for each frame. If an array is provided,
   * its length must match the total number of frames.
   * @param options - Optional parameters for creating the animation set.
   */
  public createAnimation(
    animationSetName: string,
    animationName: string,
    spritesPerColumn: number,
    spritesPerRow: number,
    animationFrameDurationSeconds: number | number[],
    options?: Partial<AnimationCreationParams>,
  ): void {
    const {
      startPositionPercentage,
      endPositionPercentage,
      numFrames,
      nextAnimationName,
      animationEvents,
    } = {
      ...defaultCreateAnimationSetParams,
      numFrames: spritesPerColumn * spritesPerRow,
      ...options,
    };

    this._validateAnimationEvents(animationEvents, numFrames);
    this._validateAnimationFrameDurations(
      animationFrameDurationSeconds,
      numFrames,
    );

    const spriteUVSize = new Vector2(
      (endPositionPercentage.x - startPositionPercentage.x) / spritesPerRow,
      (endPositionPercentage.y - startPositionPercentage.y) / spritesPerColumn,
    );

    const animationFrames = this._generateAnimationFrames(
      numFrames,
      spritesPerRow,
      startPositionPercentage,
      spriteUVSize,
      animationFrameDurationSeconds,
    );

    const animationSet: Animation = {
      animationName,
      frames: animationFrames,
      nextAnimationName,
      animationEvents,
    };

    const currentAnimations =
      this._animationSets.get(animationSetName) ?? new Map<string, Animation>();
    this._animationSets.set(animationSetName, currentAnimations);

    currentAnimations.set(animationName, animationSet);
  }

  /**
   * Retrieves the animation for a given animation set and animation name.
   * @param animationSetName - The name of the animation set (e.g., 'player', 'enemy').
   * @param animationName - The name of the animation (e.g., 'walk', 'run').
   * @returns The Animation if found, or null if not found.
   */
  public getAnimation(
    animationSetName: string,
    animationName: string,
  ): Animation | null {
    return (
      this._animationSets.get(animationSetName)?.get(animationName) ?? null
    );
  }

  /**
   * Retrieves the current animation frame for a given SpriteAnimationComponent.
   * @param spriteAnimationComponent - The SpriteAnimationComponent to get the current frame for.
   * @returns The current AnimationFrame or null if the component is not provided.
   */
  public getAnimationFrame(
    spriteAnimationComponent: SpriteAnimationComponent,
  ): AnimationFrame {
    const {
      animationSetName: entityType,
      currentAnimationName: currentAnimationSetName,
      animationIndex,
    } = spriteAnimationComponent;

    const animationSet = this.getAnimation(entityType, currentAnimationSetName);

    if (!animationSet) {
      throw new Error(
        `No animation found for entity type: ${entityType}, animation: ${currentAnimationSetName}`,
      );
    }

    const { frames: animationFrames } = animationSet;

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
   * Validates the animation event frames to ensure they are within the correct frame range, and are all whole numbers.
   * @param animationEvents - The animation events to validate.
   * @param numFrames - The total number of frames in the animation.
   */
  private _validateAnimationEvents(
    animationEvents: AnimationEventData,
    numFrames: number,
  ) {
    for (const [frame] of animationEvents) {
      if (frame < 0 || frame >= numFrames) {
        throw new Error(`Invalid animation event frame: ${frame}`);
      }

      if (!Number.isInteger(frame)) {
        throw new Error(
          `Animation event frame must be a whole number, frame: ${frame}`,
        );
      }
    }
  }

  /**
   * Validates the animation frame durations, to ensure it is a single number, or an array of the same size as the number of frames.
   * @param animationFrameDurationSeconds - The animation frame durations to validate.
   * @param numFrames - The total number of frames in the animation.
   */
  private _validateAnimationFrameDurations(
    animationFrameDurationSeconds: number | number[],
    numFrames: number,
  ) {
    if (
      Array.isArray(animationFrameDurationSeconds) &&
      animationFrameDurationSeconds.length !== numFrames
    ) {
      throw new Error(
        `Animation duration array length (${animationFrameDurationSeconds.length}) must be equal to the number of frames (${numFrames}).`,
      );
    }
  }
}
