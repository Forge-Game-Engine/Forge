import { EcsSystem } from '../../ecs/ecs-system.js';
import { SoundEcsComponent, soundId } from '../components/index.js';
import {
  canStartOneShot,
  getBusInternals,
} from '../internal/audio-internals.js';
import { SoundInstance } from '../internal/sound-instance.js';
import type { MixerBus } from '../mixer-bus.js';
import type { SoundAsset } from '../sound-asset.js';

/**
 * What the system last applied for one component, to tell what the game
 * has changed since.
 */
interface TrackedSound {
  /** The playing instance, or `null` while paused or not yet started. */
  instance: SoundInstance | null;
  sound: SoundAsset;
  bus: MixerBus;
  volume: number;
  rate: number;
  loop: boolean;
  /** Where to resume from, in seconds into the sound. */
  positionSeconds: number;
  /** The last update the component was found in, to notice its removal. */
  lastSeenUpdate: number;
}

const createTrackedSound = (component: SoundEcsComponent): TrackedSound => ({
  instance: null,
  sound: component.sound,
  bus: component.bus,
  volume: component.volume,
  rate: component.rate,
  loop: component.loop,
  positionSeconds: 0,
  lastSeenUpdate: 0,
});

const start = (component: SoundEcsComponent, tracked: TrackedSound): void => {
  const bus = getBusInternals(component.bus);

  if (!component.loop && !canStartOneShot(bus.mixer)) {
    component.hasFinished = true;

    return;
  }

  tracked.instance = new SoundInstance(bus, component.sound, {
    volume: component.volume,
    rate: component.rate,
    loop: component.loop,
    offsetSeconds: tracked.positionSeconds,
  });
  tracked.bus = component.bus;
  tracked.volume = component.volume;
  tracked.rate = component.rate;
  tracked.loop = component.loop;
};

const applyChanges = (
  component: SoundEcsComponent,
  tracked: TrackedSound,
  instance: SoundInstance,
): void => {
  if (component.volume !== tracked.volume) {
    instance.setVolume(component.volume);
    tracked.volume = component.volume;
  }

  if (component.rate !== tracked.rate) {
    instance.setRate(component.rate);
    tracked.rate = component.rate;
  }

  if (component.loop !== tracked.loop) {
    instance.setLoop(component.loop);
    tracked.loop = component.loop;
  }

  if (component.bus !== tracked.bus) {
    instance.setBus(getBusInternals(component.bus));
    tracked.bus = component.bus;
  }
};

const reconcile = (
  component: SoundEcsComponent,
  tracked: TrackedSound,
): void => {
  if (component.hasFinished) {
    return;
  }

  // The system only lets go of instances it stops itself, so one that has
  // ended played to its end, or its mixer was stopped.
  if (tracked.instance?.hasEnded) {
    tracked.instance = null;
    component.hasFinished = true;

    return;
  }

  if (component.sound !== tracked.sound) {
    tracked.instance?.stop();
    tracked.instance = null;
    tracked.sound = component.sound;
    tracked.positionSeconds = 0;
  }

  if (component.paused) {
    if (tracked.instance) {
      tracked.positionSeconds = tracked.instance.positionSeconds;
      tracked.instance.stop();
      tracked.instance = null;
    }

    return;
  }

  if (!tracked.instance) {
    start(component, tracked);

    return;
  }

  applyChanges(component, tracked, tracked.instance);
};

/**
 * Creates a system that plays each entity's {@link SoundEcsComponent}.
 *
 * Every update it starts sounds that haven't started, pauses and resumes
 * them as `paused` changes, applies changes to `volume`, `rate`, `loop`,
 * `bus` and `sound` to the playing sound, sets `hasFinished` once a
 * non-looping sound has played to its end, and stops the sound of any
 * component or entity removed since the last update. When the world stops,
 * every sound it started is stopped. Sound assets are left alone, so a new
 * world can play them again.
 * @returns The ECS system.
 */
export const createSoundEcsSystem = (): EcsSystem<[SoundEcsComponent]> => {
  const trackedSounds = new Map<SoundEcsComponent, TrackedSound>();
  let updateCount = 0;

  return {
    query: [soundId],
    update: (_world, { components: [soundComponents] }) => {
      updateCount++;

      for (const component of soundComponents) {
        let tracked = trackedSounds.get(component);

        if (!tracked) {
          tracked = createTrackedSound(component);
          trackedSounds.set(component, tracked);
        }

        tracked.lastSeenUpdate = updateCount;
        reconcile(component, tracked);
      }

      for (const [component, tracked] of trackedSounds) {
        if (tracked.lastSeenUpdate !== updateCount) {
          tracked.instance?.stop();
          trackedSounds.delete(component);
        }
      }
    },
    cleanup: () => {
      for (const tracked of trackedSounds.values()) {
        tracked.instance?.stop();
      }

      trackedSounds.clear();
    },
  };
};
