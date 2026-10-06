import { EcsSystem } from '../../ecs/ecs-system.js';
import { SoundEcsComponent, soundId } from '../components/index.js';
import { toAudioBus } from '../audio-bus.js';
import { SoundPlayback } from '../sound-playback.js';

/**
 * Creates an ECS system that plays every entity's {@link SoundEcsComponent}.
 *
 * Each tick, for each component:
 * - a component that hasn't started, isn't `paused` and hasn't finished
 *   starts its sound;
 * - setting `paused` pauses the sound at its position, and clearing it
 *   resumes from there;
 * - changes to `volume`, `rate`, `loop` and `bus` apply to the playing
 *   sound, and a new `sound` starts from the beginning;
 * - a non-looping sound that played to its end sets `hasFinished`.
 *
 * A sound whose component or entity has been removed since the last tick
 * is stopped. When the world stops, every sound the system started is
 * stopped. Sound assets are left alone, so the same assets play again in a
 * restarted world.
 * @returns The ECS system.
 */
export const createSoundEcsSystem = (): EcsSystem<[SoundEcsComponent]> => {
  const playbacks = new Map<SoundEcsComponent, SoundPlayback>();

  const createPlayback = (component: SoundEcsComponent): SoundPlayback =>
    new SoundPlayback(toAudioBus(component.bus), component.sound, component);

  const reconcile = (
    component: SoundEcsComponent,
    playback: SoundPlayback,
  ): SoundPlayback => {
    if (playback.sound !== component.sound) {
      playback.stop();

      const replacement = createPlayback(component);

      if (!component.paused) {
        replacement.start();
      }

      return replacement;
    }

    const bus = toAudioBus(component.bus);

    if (playback.bus !== bus) {
      playback.bus = bus;
    }

    if (playback.volume !== component.volume) {
      playback.volume = component.volume;
    }

    if (playback.rate !== component.rate) {
      playback.rate = component.rate;
    }

    if (playback.loop !== component.loop) {
      playback.loop = component.loop;
    }

    if (component.paused) {
      playback.pause();
    } else {
      playback.resume();
    }

    return playback;
  };

  return {
    query: [soundId],
    update: (_world, { components: [soundComponents] }) => {
      const present = new Set(soundComponents);

      for (const [component, playback] of playbacks) {
        if (!present.has(component)) {
          playback.stop();
          playbacks.delete(component);
        }
      }

      for (const component of soundComponents) {
        if (component.hasFinished) {
          continue;
        }

        const existing = playbacks.get(component);
        let playback: SoundPlayback;

        if (existing) {
          playback = reconcile(component, existing);
        } else {
          playback = createPlayback(component);

          if (!component.paused) {
            playback.start();
          }
        }

        if (playback.hasEnded) {
          component.hasFinished = true;
          playbacks.delete(component);

          continue;
        }

        playbacks.set(component, playback);
      }
    },
    cleanup: () => {
      for (const playback of playbacks.values()) {
        playback.stop();
      }

      playbacks.clear();
    },
  };
};
