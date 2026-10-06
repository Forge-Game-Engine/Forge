import { EcsSystem } from '../../ecs/ecs-system.js';
import { SoundEcsComponent, soundId } from '../components/index.js';
import { toAudioBus } from '../internal/audio-bus.js';
import { Voice } from '../internal/voice.js';

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
  const voices = new Map<SoundEcsComponent, Voice>();

  const createVoice = (component: SoundEcsComponent): Voice =>
    new Voice(toAudioBus(component.bus), component.sound, component);

  const reconcile = (component: SoundEcsComponent, voice: Voice): Voice => {
    if (voice.sound !== component.sound) {
      voice.stop();

      const replacement = createVoice(component);

      if (!component.paused) {
        replacement.start();
      }

      return replacement;
    }

    const bus = toAudioBus(component.bus);

    if (voice.bus !== bus) {
      voice.bus = bus;
    }

    if (voice.volume !== component.volume) {
      voice.volume = component.volume;
    }

    if (voice.rate !== component.rate) {
      voice.rate = component.rate;
    }

    if (voice.loop !== component.loop) {
      voice.loop = component.loop;
    }

    if (component.paused) {
      voice.pause();
    } else {
      voice.resume();
    }

    return voice;
  };

  return {
    query: [soundId],
    update: (_world, { components: [soundComponents] }) => {
      const present = new Set(soundComponents);

      for (const [component, voice] of voices) {
        if (!present.has(component)) {
          voice.stop();
          voices.delete(component);
        }
      }

      for (const component of soundComponents) {
        if (component.hasFinished) {
          continue;
        }

        const existing = voices.get(component);
        let voice: Voice;

        if (existing) {
          voice = reconcile(component, existing);
        } else {
          voice = createVoice(component);

          if (!component.paused) {
            voice.start();
          }
        }

        if (voice.hasEnded) {
          component.hasFinished = true;
          voices.delete(component);

          continue;
        }

        voices.set(component, voice);
      }
    },
    cleanup: () => {
      for (const voice of voices.values()) {
        voice.stop();
      }

      voices.clear();
    },
  };
};
