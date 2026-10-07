import {
  addSoundComponent,
  createSoundAsset,
  createSoundEcsSystem,
  createSoundMixer,
  MixerBus,
  PlayingSound,
  playSound,
  SoundAsset,
  SoundMixerState,
} from '../../../src/audio/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const sampleRate = 44100;
const toneFrequency = 440;
const toneAmplitude = 0.5;

/** Logged once the scene's audio context exists. */
export const audioMixerSceneReadyMessage =
  '[audio-mixer] audio context created';

// The buses the spec compares, by name.
export const busNames = ['full', 'half', 'muted'] as const;

export type BusName = (typeof busNames)[number];

/**
 * An `AudioContext` whose `destination` is an `AnalyserNode` in front of the
 * real one, so everything the mixer's master bus outputs can be measured
 * without the mixer exposing its nodes.
 */
class MeteredAudioContext extends AudioContext {
  private _meter: AnalyserNode | null = null;

  /** The analyser everything the context plays passes through. */
  get meter(): AnalyserNode {
    if (!this._meter) {
      const meter = new AnalyserNode(this, { fftSize: 2048 });
      // The real destination, read through the base class's getter since
      // this class overrides it.
      const speakers: AudioDestinationNode = Reflect.get(
        BaseAudioContext.prototype,
        'destination',
        this,
      );

      meter.connect(speakers);
      this._meter = meter;
    }

    return this._meter;
  }

  get destination(): AudioDestinationNode {
    // Only ever used as a node to connect to, which an analyser is too.
    return this.meter as unknown as AudioDestinationNode;
  }
}

/** One second of a sine tone, which loops seamlessly at 440Hz. */
const createTone = (): SoundAsset => {
  const samples = new Float32Array(sampleRate);

  for (let i = 0; i < samples.length; i++) {
    samples[i] =
      toneAmplitude * Math.sin((2 * Math.PI * toneFrequency * i) / sampleRate);
  }

  return createSoundAsset({ sampleRate, channels: [samples] });
};

export interface AudioMixerSceneHandle extends SceneHandle {
  /** The mixer's state, e.g. `'suspended'` before the first click. */
  state(): SoundMixerState;
  /** Plays the tone once on the `full` bus; returns whether it's playing. */
  playOneShot(): boolean;
  /** Whether the tone the first `pointerup` played is still playing. */
  isClickSoundPlaying(): boolean | null;
  /** Starts the tone looping on the named bus. */
  startLoop(bus: BusName): void;
  /** Stops the looping tone. */
  stopLoop(): void;
  /** Adds an entity with a looping sound component on the `full` bus. */
  addSoundEntity(): void;
  /** Removes that entity. */
  removeSoundEntity(): void;
  /** The root mean square of what the master bus outputs right now. */
  measureLevel(): number;
}

export const createScene: CreateScene = (): AudioMixerSceneHandle => {
  const context = new MeteredAudioContext();
  const mixer = createSoundMixer(context);
  const buses: Record<BusName, MixerBus> = {
    full: mixer.createBus('full'),
    half: mixer.createBus('half'),
    muted: mixer.createBus('muted'),
  };

  buses.half.volume = 0.5;
  buses.muted.muted = true;

  const tone = createTone();
  const world = new EcsWorld();

  world.addSystem(createSoundEcsSystem());

  let loop: PlayingSound | null = null;
  let clickSound: PlayingSound | null = null;
  let soundEntity: number | null = null;

  // Plays a sound from the same gesture that unlocks audio, the way a game's
  // first click (a menu button, a first shot) does.
  window.addEventListener(
    'pointerup',
    () => {
      clickSound = playSound(buses.full, tone);
    },
    { once: true },
  );

  const samples = new Float32Array(context.meter.fftSize);

  // The spec waits for this instead of polling the page, since Playwright
  // runs every `page.evaluate` as a user gesture: one before the context
  // exists would let the browser start it unlocked.
  console.info(audioMixerSceneReadyMessage);

  return {
    step: (): void => {
      world.update();
    },
    state: () => mixer.state,
    playOneShot: () => playSound(buses.full, tone).isPlaying,
    isClickSoundPlaying: () => clickSound?.isPlaying ?? null,
    startLoop: (bus) => {
      loop = playSound(buses[bus], tone, { loop: true });
    },
    stopLoop: () => {
      loop?.stop();
      loop = null;
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
    measureLevel: () => {
      context.meter.getFloatTimeDomainData(samples);

      let sumOfSquares = 0;

      for (const sample of samples) {
        sumOfSquares += sample * sample;
      }

      return Math.sqrt(sumOfSquares / samples.length);
    },
  };
};
