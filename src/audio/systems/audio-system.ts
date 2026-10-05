import { Howl } from 'howler';
import { AudioEcsComponent, audioId } from '../components/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { getEffectiveBusVolume } from '../audio-bus.js';

/** One play of a sound that `createAudioEcsSystem` started. */
interface Playback {
  readonly sound: Howl;

  /** Howler's id for this play, telling it apart from other plays of `sound`. */
  readonly id: number;

  /** The component that started it, whose `volume` and `bus` it follows. */
  readonly component: AudioEcsComponent;

  /** The volume last given to Howler, so it's only set again on a change. */
  appliedVolume: number;

  /** Stops tracking this play, once it has finished or been stopped. */
  readonly release: () => void;
}

const getPlaybackVolume = ({ volume, bus }: AudioEcsComponent): number =>
  bus ? volume * getEffectiveBusVolume(bus) : volume;

/**
 * Creates an ECS system to handle audio playback.
 *
 * Each tick, entities with an {@link AudioEcsComponent} whose `playSound` is
 * `true` have their `sound` played and `playSound` reset to `false`. Every
 * play the system has started is kept at its component's `volume`, scaled
 * by the component's `bus`, until it finishes, so changing either (e.g. a
 * music volume slider) takes effect on sounds that are already playing.
 *
 * A play outlives its entity: removing the entity (e.g. a bullet that hits
 * something) lets its sound finish rather than cutting it off. When the
 * world stops, every play the system started that's still going is
 * stopped. The `Howl`s themselves are never unloaded: they belong to the
 * caller, and may be shared with other components or worlds.
 * @returns An ECS system that manages audio playback for entities with AudioEcsComponent.
 */
export const createAudioEcsSystem = (): EcsSystem<[AudioEcsComponent]> => {
  const playbacks = new Set<Playback>();

  const play = (component: AudioEcsComponent): void => {
    const { sound } = component;
    const id = sound.play();
    const appliedVolume = getPlaybackVolume(component);

    sound.volume(appliedVolume, id);

    // A looping sound raises `end` every time it comes round, so only a
    // play that has stopped looping is finished when it does.
    const onEnd = (): void => {
      if (!sound.loop(id)) {
        release();
      }
    };

    const release = (): void => {
      playbacks.delete(playback);
      sound.off('end', onEnd, id);
      sound.off('stop', release, id);
    };

    const playback: Playback = {
      sound,
      id,
      component,
      appliedVolume,
      release,
    };

    sound.on('end', onEnd, id);
    sound.on('stop', release, id);
    playbacks.add(playback);
  };

  return {
    query: [audioId],
    update: (_world, { components: [audioComponents] }) => {
      for (const audioComponent of audioComponents) {
        if (audioComponent.playSound) {
          play(audioComponent);
          audioComponent.playSound = false;
        }
      }

      for (const playback of playbacks) {
        // Unloading a `Howl` ends its plays without raising `stop`.
        if (playback.sound.state() === 'unloaded') {
          playback.release();

          continue;
        }

        const volume = getPlaybackVolume(playback.component);

        if (volume !== playback.appliedVolume) {
          playback.sound.volume(volume, playback.id);
          playback.appliedVolume = volume;
        }
      }
    },
    cleanup: () => {
      for (const playback of [...playbacks]) {
        playback.release();
        playback.sound.stop(playback.id);
      }
    },
  };
};
