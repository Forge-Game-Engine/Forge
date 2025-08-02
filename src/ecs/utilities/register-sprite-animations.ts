import { AnimationSetManager } from '../../animations';

/**
 * Registers a new SpriteAnimationManager instance.
 * This instance is used to create and manage sprite animations in the game.
 *
 * @returns A new instance of SpriteAnimationManager.
 */
export const registerSpriteAnimationManager = () => {
  return new AnimationSetManager();
};
