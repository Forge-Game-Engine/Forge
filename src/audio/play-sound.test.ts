import { beforeEach, describe, expect, it } from 'vitest';
import {
  createFakeSound,
  FakeAudioContext,
  setUserActivation,
} from './fake-audio-context.test-helper.js';
import { createSoundMixer, SoundMixer } from './sound-mixer.js';
import { playSound } from './play-sound.js';
import { MixerBus } from './mixer-bus.js';
import { toAudioBus } from './audio-bus.js';

describe('playSound', () => {
  let context: FakeAudioContext;
  let mixer: SoundMixer;
  let sfx: MixerBus;

  beforeEach(() => {
    context = new FakeAudioContext();
    setUserActivation(true);
    mixer = createSoundMixer(context.asAudioContext());
    sfx = mixer.createBus('sfx');
  });

  it('starts a source through an instance gain into the bus', () => {
    const sound = createFakeSound();
    const playing = playSound(sfx, sound, { volume: 0.4, rate: 2 });
    const [source] = context.sources;
    const [gain] = source.connections;

    expect(playing.isPlaying).toBe(true);
    expect(source.buffer).toBe(sound.buffer);
    expect(source.playbackRate.value).toBe(2);
    expect(source.loop).toBe(false);
    expect(source.startedAt).toEqual({ when: 0, offset: 0 });
    expect(
      (gain as unknown as { gain: { value: number } }).gain.value,
    ).toBeCloseTo(0.4);
    expect(gain.connections.has(toAudioBus(sfx).node as never)).toBe(true);
  });

  it('plays overlapping instances of one sound', () => {
    const sound = createFakeSound();

    playSound(sfx, sound);
    playSound(sfx, sound);

    expect(context.sources).toHaveLength(2);
  });

  it('changes the instance volume', () => {
    const playing = playSound(sfx, createFakeSound());
    const [gain] = context.sources[0].connections;

    playing.volume = 0.25;

    expect(playing.volume).toBe(0.25);
    expect((gain as unknown as { gain: { value: number } }).gain.value).toBe(
      0.25,
    );
  });

  it('fades out before stopping', () => {
    const playing = playSound(sfx, createFakeSound());
    const [source] = context.sources;
    const [gain] = source.connections;

    context.currentTime = 1;
    playing.stop();

    expect(playing.isPlaying).toBe(false);
    expect((gain as unknown as { gain: { value: number } }).gain.value).toBe(0);
    expect(source.stoppedAt).toBeGreaterThan(1);

    source.end();

    expect(source.connections.size).toBe(0);
  });

  it('is no longer playing once the sound ends', () => {
    const playing = playSound(sfx, createFakeSound());

    context.sources[0].end();

    expect(playing.isPlaying).toBe(false);
  });

  it('throws for a bus not created by a mixer', () => {
    expect(() =>
      playSound(
        { name: 'fake', parent: null, volume: 1, muted: false },
        createFakeSound(),
      ),
    ).toThrow(/wasn't created by a sound mixer/);
  });

  describe('before the page has had user input', () => {
    beforeEach(() => {
      setUserActivation(false);
    });

    it('drops a non-looping sound', () => {
      const playing = playSound(sfx, createFakeSound());

      expect(playing.isPlaying).toBe(false);
      expect(context.sources).toHaveLength(0);
    });

    it('starts a looping sound', () => {
      const playing = playSound(sfx, createFakeSound(), { loop: true });

      expect(playing.isPlaying).toBe(true);
      expect(context.sources[0].loop).toBe(true);
    });

    it('plays a sound requested in the input that unlocks audio', () => {
      let playing: ReturnType<typeof playSound> | null = null;

      window.addEventListener(
        'pointerup',
        () => {
          // The browser sets sticky activation before dispatching the event.
          setUserActivation(true);
          playing = playSound(sfx, createFakeSound());
        },
        { once: true },
      );

      window.dispatchEvent(new Event('pointerup'));

      expect(playing).not.toBeNull();
      expect(playing!.isPlaying).toBe(true);
    });

    it('plays a sound once the context runs', () => {
      context.setState('running');

      expect(playSound(sfx, createFakeSound()).isPlaying).toBe(true);
    });
  });
});
