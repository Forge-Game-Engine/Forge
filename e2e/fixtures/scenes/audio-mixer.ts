import {
  addSoundComponent,
  createSoundAsset,
  createSoundEcsSystem,
  createSoundMixer,
  EcsWorld,
  playSound,
  type MixerBus,
  type SoundMixerState,
} from '../../../src/index.js';
import type { CreateScene, SceneHandle } from './scene.js';

/**
 * An `AudioContext` whose `destination` is an `AnalyserNode` in front of the
 * real speakers, so the scene can measure exactly what the mixer's master
 * bus outputs.
 */
class TappedAudioContext extends AudioContext {
  public readonly analyser: AnalyserNode;

  constructor() {
    super();
    this.analyser = new AnalyserNode(this, { fftSize: 2048 });
    this.analyser.connect(super.destination);
  }

  // The mixer connects its master bus to `destination`.
  override get destination(): AudioDestinationNode {
    return this.analyser as unknown as AudioDestinationNode;
  }
}

export type AudioMixerBusName = 'full' | 'half' | 'muted';

export interface AudioMixerSceneHandle extends SceneHandle {
  readonly state: SoundMixerState;
  /** Plays a looping tone through `bus` with `playSound` and returns the master bus's RMS level. */
  measurePlaySoundLevel(bus: AudioMixerBusName): Promise<number>;
  /** Adds an entity with a looping `SoundEcsComponent` on the `full` bus. */
  addSoundEntity(): void;
  /** Removes the entity added by `addSoundEntity`. */
  removeSoundEntity(): void;
  /** The master bus's RMS level right now. */
  measureLevel(): Promise<number>;
}

const measureMilliseconds = 300;
const settleMilliseconds = 100;

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const createScene: CreateScene =
  async (): Promise<AudioMixerSceneHandle> => {
    const context = new TappedAudioContext();

    // Headless Chromium lets any page start audio without user input,
    // whatever its `--autoplay-policy`. Suspending the context first puts it
    // where every real browser leaves a page that hasn't had input yet, so
    // the spec can check that a real click resumes it. Which sounds play
    // before input is covered by unit tests instead: Playwright runs every
    // `page.evaluate` as a user gesture, so the page has always had
    // activation by the time a spec can play anything.
    await context.suspend();

    const mixer = createSoundMixer(context);
    const buses: Record<AudioMixerBusName, MixerBus> = {
      full: mixer.createBus('full'),
      half: mixer.createBus('half'),
      muted: mixer.createBus('muted'),
    };

    buses.half.volume = 0.5;
    buses.muted.muted = true;

    // One second of a 440Hz sine: a whole number of cycles, so it loops
    // without a seam.
    const samples = new Float32Array(context.sampleRate);

    for (let i = 0; i < samples.length; i++) {
      samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / context.sampleRate);
    }

    const tone = createSoundAsset({
      sampleRate: context.sampleRate,
      channels: [samples],
    });

    const world = new EcsWorld();

    world.addSystem(createSoundEcsSystem());

    let soundEntity: number | null = null;

    const measureLevel = async (): Promise<number> => {
      const data = new Float32Array(context.analyser.fftSize);
      let sumOfSquares = 0;
      let count = 0;
      const end = performance.now() + measureMilliseconds;

      while (performance.now() < end) {
        context.analyser.getFloatTimeDomainData(data);

        for (const sample of data) {
          sumOfSquares += sample * sample;
        }

        count += data.length;
        // eslint-disable-next-line no-await-in-loop
        await wait(20);
      }

      return Math.sqrt(sumOfSquares / count);
    };

    return {
      step: () => {
        world.update();
      },
      get state() {
        return mixer.state;
      },
      measurePlaySoundLevel: async (bus) => {
        const sound = playSound(buses[bus], tone, { loop: true });

        await wait(settleMilliseconds);

        const level = await measureLevel();

        sound.stop();
        await wait(settleMilliseconds);

        return level;
      },
      addSoundEntity: () => {
        soundEntity = world.createEntity();
        addSoundComponent(world, soundEntity, {
          sound: tone,
          bus: buses.full,
          loop: true,
        });
      },
      removeSoundEntity: () => {
        if (soundEntity !== null) {
          world.removeEntity(soundEntity);
          soundEntity = null;
        }
      },
      measureLevel: async () => {
        await wait(settleMilliseconds);

        return measureLevel();
      },
    };
  };
