import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { playSound } from './play-sound.js';
import { createSoundMixer, SoundMixer } from './sound-mixer.js';
import {
  createFakeSoundAsset,
  FakeAudioContext,
} from './test-helpers/fake-audio-context.js';

describe('createSoundMixer', () => {
  let context: FakeAudioContext;
  let mixer: SoundMixer;

  beforeEach(() => {
    context = new FakeAudioContext();
    mixer = createSoundMixer(context.asAudioContext());
  });

  afterEach(async () => {
    await mixer.stop();
  });

  describe('buses', () => {
    it('connects the master bus to the destination', () => {
      const [masterGain] = context.gains;

      expect(mixer.master.name).toBe('master');
      expect(mixer.master.parent).toBeNull();
      expect(masterGain.connections).toEqual(new Set([context.destination]));
    });

    it('creates buses under master by default', () => {
      const music = mixer.createBus('music');
      const [masterGain, musicGain] = context.gains;

      expect(music.parent).toBe(mixer.master);
      expect(musicGain.connections).toEqual(new Set([masterGain]));
    });

    it('nests a bus under the given parent', () => {
      const sfx = mixer.createBus('sfx');
      const ui = mixer.createBus('ui', sfx);
      const [, sfxGain, uiGain] = context.gains;

      expect(ui.parent).toBe(sfx);
      expect(uiGain.connections).toEqual(new Set([sfxGain]));
    });

    it('throws when a bus name is already used', () => {
      mixer.createBus('music');

      expect(() => mixer.createBus('music')).toThrow(/already has a bus/);
      expect(() => mixer.createBus('master')).toThrow(/already has a bus/);
    });

    it('throws when the parent belongs to another mixer', async () => {
      const otherMixer = createSoundMixer(
        new FakeAudioContext().asAudioContext(),
      );

      expect(() => mixer.createBus('music', otherMixer.master)).toThrow(
        /different sound mixer/,
      );

      await otherMixer.stop();
    });

    it('gets buses by name', () => {
      const music = mixer.createBus('music');

      expect(mixer.getBus('music')).toBe(music);
      expect(mixer.getBus('master')).toBe(mixer.master);
      expect(() => mixer.getBus('voice')).toThrow(/no bus named "voice"/);
    });

    it('ramps the gain to a new volume', () => {
      const music = mixer.createBus('music');
      const [, musicGain] = context.gains;

      context.currentTime = 3;
      music.volume = 0.25;

      expect(music.volume).toBe(0.25);
      expect(musicGain.gain.value).toBe(0.25);
      expect(musicGain.gain.calls).toEqual(['setTargetAtTime(0.25, 3)']);
    });

    it('silences a muted bus and restores its volume when unmuted', () => {
      const music = mixer.createBus('music');
      const [, musicGain] = context.gains;

      music.volume = 0.5;
      music.muted = true;

      expect(musicGain.gain.value).toBe(0);
      expect(music.volume).toBe(0.5);

      music.muted = false;

      expect(musicGain.gain.value).toBe(0.5);
    });

    it('throws for a negative or non-finite volume', () => {
      expect(() => {
        mixer.master.volume = -0.1;
      }).toThrow(/"master" must be a finite number/);
      expect(() => {
        mixer.master.volume = Number.NaN;
      }).toThrow(/finite number/);
    });
  });

  describe('unlocking', () => {
    it('resumes the context on a pointer release', () => {
      window.dispatchEvent(new Event('pointerup'));

      expect(context.resumeCalls).toBe(1);
    });

    it.each(['touchend', 'click'])('resumes the context on %s', (type) => {
      window.dispatchEvent(new Event(type));

      expect(context.resumeCalls).toBe(1);
    });

    it('resumes on a key press, but not on Escape', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(context.resumeCalls).toBe(0);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

      expect(context.resumeCalls).toBe(1);
    });

    it('keeps listening until the context runs', () => {
      window.dispatchEvent(new Event('pointerup'));
      window.dispatchEvent(new Event('pointerup'));

      expect(context.resumeCalls).toBe(2);

      context.setState('running');
      window.dispatchEvent(new Event('pointerup'));

      expect(context.resumeCalls).toBe(2);
    });

    it('listens again when the context is interrupted', () => {
      context.setState('running');
      context.setState('interrupted');
      window.dispatchEvent(new Event('pointerup'));

      expect(context.resumeCalls).toBe(1);
      expect(mixer.state).toBe('interrupted');
    });

    it("doesn't resume on gestures while the game has suspended audio", async () => {
      context.setState('running');
      await mixer.suspend();
      window.dispatchEvent(new Event('pointerup'));

      expect(context.resumeCalls).toBe(0);

      await mixer.resume();

      expect(context.resumeCalls).toBe(1);
    });

    it("doesn't listen when the context starts out running", async () => {
      const runningContext = new FakeAudioContext('running');
      const runningMixer = createSoundMixer(runningContext.asAudioContext());

      window.dispatchEvent(new Event('pointerup'));

      expect(runningContext.resumeCalls).toBe(0);

      await runningMixer.stop();
    });
  });

  describe('stop', () => {
    it('stops listening for gestures and closes the context', async () => {
      await mixer.stop();
      window.dispatchEvent(new Event('pointerup'));

      expect(context.resumeCalls).toBe(0);
      expect(mixer.state).toBe('closed');
    });

    it('stops every playing sound', async () => {
      context.setState('running');

      const sound = playSound(mixer.master, createFakeSoundAsset());
      const [source] = context.sources;

      await mixer.stop();

      expect(sound.isPlaying).toBe(false);
      expect(source.stopTime).toBe(0);
      expect(source.connections.size).toBe(0);
    });

    it('refuses to play or create buses afterwards', async () => {
      await mixer.stop();

      expect(() => playSound(mixer.master, createFakeSoundAsset())).toThrow(
        /stopped sound mixer/,
      );
      expect(() => mixer.createBus('music')).toThrow(/has been stopped/);
    });

    it('does nothing when called again', async () => {
      await mixer.stop();

      await expect(mixer.stop()).resolves.toBeUndefined();
    });
  });
});
