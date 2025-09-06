import { AnimationSetManager } from '../../animations';

/**
 * Registers a new AnimationSetManager instance.
 * This instance is used to create and manage sprite animations in the game.
 *
 * @returns A new instance of AnimationSetManager.
 */
export const registerAnimationSetManager = () => {
  return new AnimationSetManager();
};
