import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFakeSound,
  FakeAudioContext,
  FakeGainNode,
  setUserActivation,
} from './fake-audio-context.test-helper.js';
import { createSoundMixer } from './sound-mixer.js';
import { playSound } from './play-sound.js';
import { toAudioBus } from './audio-bus.js';

const gainOf = (node: GainNode): number =>
  (node as unknown as FakeGainNode).gain.value;

describe('createSoundMixer', () => {
  let context: FakeAudioContext;

  beforeEach(() => {
    context = new FakeAudioContext();
    setUserActivation(false);
  });

  it('connects the master bus to the destination', () => {
    const mixer = createSoundMixer(context.asAudioContext());
    const master = toAudioBus(mixer.master);

    expect(master.name).toBe('master');
    expect(master.parent).toBeNull();
    expect(
      (master.node as unknown as FakeGainNode).connections.has(
        context.destination,
      ),
    ).toBe(true);
  });

  it('creates buses under master by default, or under a given parent', () => {
    const mixer = createSoundMixer(context.asAudioContext());
    const music = mixer.createBus('music');
    const ambience = mixer.createBus('ambience', music);

    expect(music.parent).toBe(mixer.master);
    expect(ambience.parent).toBe(music);
    expect(
      (toAudioBus(ambience).node as unknown as FakeGainNode).connections.has(
        toAudioBus(music).node as unknown as FakeGainNode,
      ),
    ).toBe(true);
    expect(mixer.getBus('ambience')).toBe(ambience);
  });

  it('throws on a duplicate bus name or an unknown bus', () => {
    const mixer = createSoundMixer(context.asAudioContext());

    mixer.createBus('sfx');

    expect(() => mixer.createBus('sfx')).toThrow(/already has a bus/);
    expect(() => mixer.createBus('master')).toThrow(/already has a bus/);
    expect(() => mixer.getBus('music')).toThrow(/no bus named "music"/);
  });

  it('throws when the parent belongs to another mixer', () => {
    const mixer = createSoundMixer(context.asAudioContext());
    const other = createSoundMixer(new FakeAudioContext().asAudioContext());

    expect(() => mixer.createBus('sfx', other.master)).toThrow(
      /different mixer/,
    );
  });

  it('sets a bus gain from volume and muted', () => {
    const mixer = createSoundMixer(context.asAudioContext());
    const music = mixer.createBus('music');
    const node = toAudioBus(music).node;

    music.volume = 0.5;
    expect(gainOf(node)).toBe(0.5);

    music.muted = true;
    expect(gainOf(node)).toBe(0);
    expect(music.volume).toBe(0.5);

    music.muted = false;
    expect(gainOf(node)).toBe(0.5);
  });

  it('rejects a negative or non-finite volume', () => {
    const mixer = createSoundMixer(context.asAudioContext());

    expect(() => {
      mixer.master.volume = -1;
    }).toThrow();
    expect(() => {
      mixer.master.volume = Number.NaN;
    }).toThrow();
  });

  it('mirrors the context state', () => {
    const mixer = createSoundMixer(context.asAudioContext());

    expect(mixer.state).toBe('suspended');

    context.setState('running');

    expect(mixer.state).toBe('running');
  });

  describe('unlocking', () => {
    it('resumes the context on user input until it runs', () => {
      const resume = vi.spyOn(context, 'resume');

      createSoundMixer(context.asAudioContext());

      window.dispatchEvent(new Event('pointerup'));

      expect(resume).toHaveBeenCalledTimes(1);
      expect(context.state).toBe('running');

      window.dispatchEvent(new Event('pointerup'));

      expect(resume).toHaveBeenCalledTimes(1);
    });

    it('ignores Escape', () => {
      const resume = vi.spyOn(context, 'resume');

      createSoundMixer(context.asAudioContext());

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(resume).not.toHaveBeenCalled();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(resume).toHaveBeenCalledTimes(1);
    });

    it('listens again when the context is interrupted', () => {
      const resume = vi.spyOn(context, 'resume');

      createSoundMixer(context.asAudioContext());
      context.setState('running');

      window.dispatchEvent(new Event('click'));
      expect(resume).not.toHaveBeenCalled();

      context.setState('interrupted');
      window.dispatchEvent(new Event('touchend'));

      expect(resume).toHaveBeenCalledTimes(1);
    });

    it("doesn't resume a context the game suspended", async () => {
      const mixer = createSoundMixer(context.asAudioContext());

      context.setState('running');
      await mixer.suspend();

      const resume = vi.spyOn(context, 'resume');

      window.dispatchEvent(new Event('click'));
      expect(resume).not.toHaveBeenCalled();

      await mixer.resume();

      expect(mixer.state).toBe('running');
    });

    it('stops listening when stopped', async () => {
      const mixer = createSoundMixer(context.asAudioContext());

      await mixer.stop();

      const resume = vi.spyOn(context, 'resume');

      window.dispatchEvent(new Event('pointerup'));

      expect(resume).not.toHaveBeenCalled();
      expect(mixer.state).toBe('closed');
    });
  });

  it('stops every playing sound when stopped', async () => {
    setUserActivation(true);

    const mixer = createSoundMixer(context.asAudioContext());
    const sfx = mixer.createBus('sfx');
    const first = playSound(sfx, createFakeSound());
    const second = playSound(sfx, createFakeSound(), { loop: true });

    await mixer.stop();

    expect(first.isPlaying).toBe(false);
    expect(second.isPlaying).toBe(false);
    expect(context.sources.every((source) => source.stoppedAt !== null)).toBe(
      true,
    );
  });
});
