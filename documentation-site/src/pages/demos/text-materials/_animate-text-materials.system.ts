import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Random } from '@forge-game-engine/forge/math';
import { TextMaterials } from './_create-text-materials';

const dissolveCycleSeconds = 4;
const flickerStepSeconds = 1 / 15;

/**
 * Drives each material's own uniforms: the engine only binds the font, so
 * anything that changes over time is the game's to set.
 */
export const createAnimateTextMaterialsEcsSystem = (
  time: Time,
  random: Random,
  { shimmer, dissolve, flicker }: TextMaterials,
): EcsSystem<[]> => {
  let secondsUntilFlickerStep = 0;

  return {
    query: [],
    update: () => {
      shimmer.setUniform('u_time', time.timeInSeconds);

      // Burns away, holds, then comes back, on a loop.
      const cycle =
        (time.timeInSeconds % dissolveCycleSeconds) / dissolveCycleSeconds;

      dissolve.setUniform(
        'u_progress',
        Math.min(1, Math.max(0, Math.sin(cycle * Math.PI * 2) * 0.6 + 0.4)),
      );

      secondsUntilFlickerStep -= time.deltaTimeInSeconds;

      if (secondsUntilFlickerStep > 0) {
        return;
      }

      secondsUntilFlickerStep = flickerStepSeconds;

      const isBursting = random.randomFloat(0, 1) < 0.25;

      flicker.setUniform('u_seed', random.randomFloat(0, 100));
      flicker.setUniform(
        'u_intensity',
        isBursting ? random.randomFloat(0.5, 1) : 0,
      );
    },
  };
};
