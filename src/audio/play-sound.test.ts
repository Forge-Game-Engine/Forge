import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MixerBus } from './mixer-bus.js';
import { playSound } from './play-sound.js';
import { createSoundMixer, SoundMixer } from './sound-mixer.js';
import {
  createFakeSoundAsset,
  FakeAudioContext,
} from './test-helpers/fake-audio-context.js';

describe('playSound', () => {
  let context: FakeAudioContext;
  let mixer: SoundMixer;
  let sfx: MixerBus;

  beforeEach(() => {
    context = new FakeAudioContext();
    mixer = createSoundMixer(context.asAudioContext());
    sfx = mixer.createBus('sfx');
    // Most tests are about playback after the player has interacted.
    window.dispatchEvent(new Event('pointerup'));
  });

  afterEach(async () => {
    await mixer.stop();
  });

  it('plays the sound through its own gain into the bus', () => {
    const sound = createFakeSoundAsset();

    playSound(sfx, sound, { volume: 0.4, rate: 1.5, loop: true });

    const [source] = context.sources;
    const [, sfxGain, instanceGain] = context.gains;

    expect(source.buffer).toBe(sound.buffer);
    expect(source.loop).toBe(true);
    expect(source.playbackRate.value).toBe(1.5);
    expect(source.connections).toEqual(new Set([instanceGain]));
    expect(instanceGain.gain.value).toBeCloseTo(0.4);
    expect(instanceGain.connections).toEqual(new Set([sfxGain]));
    expect(source.startCall).toEqual({ when: 0, offset: 0 });
  });

  it('defaults to full volume, normal rate and no looping', () => {
    const sound = playSound(sfx, createFakeSoundAsset());
    const [source] = context.sources;

    expect(sound.volume).toBe(1);
    expect(sound.isPlaying).toBe(true);
    expect(source.loop).toBe(false);
    expect(source.playbackRate.value).toBe(1);
  });

  it('plays overlapping instances of the same sound', () => {
    const sound = createFakeSoundAsset();

    playSound(sfx, sound);
    playSound(sfx, sound);

    expect(context.sources).toHaveLength(2);
  });

  it('ramps a volume change', () => {
    const sound = playSound(sfx, createFakeSoundAsset());
    const instanceGain = context.gains[2];

    context.currentTime = 1;
    sound.volume = 0.2;

    expect(sound.volume).toBeCloseTo(0.2);
    expect(instanceGain.gain.calls).toEqual(['setTargetAtTime(0.2, 1)']);
  });

  it('fades out and stops the source when stopped', () => {
    const sound = playSound(sfx, createFakeSoundAsset());
    const [source] = context.sources;
    const instanceGain = context.gains[2];

    context.currentTime = 2;
    sound.stop();

    expect(sound.isPlaying).toBe(false);
    expect(instanceGain.gain.calls).toEqual([
      'setValueAtTime(1, 2)',
      'linearRampToValueAtTime(0, 2.02)',
    ]);
    expect(source.stopTime).toBeCloseTo(2.02);
  });

  it('disconnects its nodes once it has ended', () => {
    const sound = playSound(sfx, createFakeSoundAsset());
    const [source] = context.sources;
    const instanceGain = context.gains[2];

    source.end();

    expect(sound.isPlaying).toBe(false);
    expect(source.connections.size).toBe(0);
    expect(instanceGain.connections.size).toBe(0);
  });

  it('throws for an invalid volume or rate', () => {
    const sound = createFakeSoundAsset();

    expect(() => playSound(sfx, sound, { volume: -1 })).toThrow(/volume/);
    expect(() => playSound(sfx, sound, { rate: 0 })).toThrow(/rate/);
    expect(context.sources).toHaveLength(0);
  });

  it("throws for a bus that wasn't made by a mixer", () => {
    const bus: MixerBus = {
      name: 'fake',
      parent: null,
      volume: 1,
      muted: false,
    };

    expect(() => playSound(bus, createFakeSoundAsset())).toThrow(
      /not made by a sound mixer/,
    );
  });

  describe('before the first gesture', () => {
    let lockedContext: FakeAudioContext;
    let lockedMixer: SoundMixer;

    beforeEach(() => {
      lockedContext = new FakeAudioContext();
      lockedMixer = createSoundMixer(lockedContext.asAudioContext());
    });

    afterEach(async () => {
      await lockedMixer.stop();
    });

    it('drops a non-looping sound', () => {
      const sound = playSound(lockedMixer.master, createFakeSoundAsset());

      expect(sound.isPlaying).toBe(false);
      expect(lockedContext.sources).toHaveLength(0);
      expect(() => {
        sound.stop();
      }).not.toThrow();
    });

    it('starts a looping sound', () => {
      const sound = playSound(lockedMixer.master, createFakeSoundAsset(), {
        loop: true,
      });

      expect(sound.isPlaying).toBe(true);
      expect(lockedContext.sources).toHaveLength(1);
    });

    it('plays a sound requested by the gesture that unlocks audio', () => {
      let sound: ReturnType<typeof playSound> | null = null;

      const playOnClick = (): void => {
        sound = playSound(lockedMixer.master, createFakeSoundAsset());
      };

      window.addEventListener('pointerup', playOnClick);
      window.dispatchEvent(new Event('pointerup'));
      window.removeEventListener('pointerup', playOnClick);

      // The context is still resuming, but the sound is scheduled.
      expect(lockedContext.state).toBe('suspended');
      expect(sound).not.toBeNull();
      expect(sound!.isPlaying).toBe(true);
    });

    it('plays a non-looping sound when the context already runs', async () => {
      const runningContext = new FakeAudioContext('running');
      const runningMixer = createSoundMixer(runningContext.asAudioContext());

      const sound = playSound(runningMixer.master, createFakeSoundAsset());

      expect(sound.isPlaying).toBe(true);

      await runningMixer.stop();
    });
  });
});
