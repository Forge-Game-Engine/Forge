import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Random } from '@forge-game-engine/forge/math';
import { GlitchEcsComponent, glitchId } from './_glitch.component';

// Long calm spells, broken by short bursts.
const calmSeconds = { min: 1, max: 2.5 };
const burstSeconds = { min: 0.15, max: 0.5 };
const stepSeconds = 1 / 18;

/**
 * Animates each glitch pass: the post-processing system only sets its
 * `u_texture`, so the effect's own uniforms are the game's to drive.
 */
export const createGlitchEcsSystem = (
  time: Time,
  random: Random,
): EcsSystem<[GlitchEcsComponent]> => ({
  query: [glitchId],
  update: (_world, { components: [glitches] }) => {
    for (const glitch of glitches) {
      glitch.secondsLeft -= time.deltaTimeInSeconds;
      glitch.secondsUntilStep -= time.deltaTimeInSeconds;

      if (glitch.secondsLeft <= 0) {
        glitch.isBursting = !glitch.isBursting;

        const { min, max } = glitch.isBursting ? burstSeconds : calmSeconds;

        glitch.secondsLeft = random.randomFloat(min, max);
        glitch.secondsUntilStep = 0;
      }

      if (glitch.secondsUntilStep > 0) {
        continue;
      }

      glitch.secondsUntilStep = stepSeconds;
      glitch.material.setUniform('u_seed', random.randomFloat(0, 100));
      glitch.material.setUniform(
        'u_intensity',
        glitch.isBursting ? random.randomFloat(0.4, 1) : 0,
      );
    }
  },
});
