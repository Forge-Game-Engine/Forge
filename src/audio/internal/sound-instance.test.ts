import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MixerBus } from '../mixer-bus.js';
import { createSoundMixer, SoundMixer } from '../sound-mixer.js';
import {
  createFakeSoundAsset,
  FakeAudioContext,
} from '../test-helpers/fake-audio-context.js';
import { getBusInternals } from './audio-internals.js';
import { SoundInstance } from './sound-instance.js';

describe('SoundInstance', () => {
  let context: FakeAudioContext;
  let mixer: SoundMixer;
  let sfx: MixerBus;
  let instance: SoundInstance;

  beforeEach(() => {
    context = new FakeAudioContext('running');
    mixer = createSoundMixer(context.asAudioContext());
    sfx = mixer.createBus('sfx');
    instance = new SoundInstance(getBusInternals(sfx), createFakeSoundAsset(), {
      volume: 1,
      rate: 1,
      loop: false,
      offsetSeconds: 0,
    });
  });

  afterEach(async () => {
    await mixer.stop();
  });

  it('ignores volume, rate and loop changes once it has ended', () => {
    const [source] = context.sources;
    const instanceGain = context.gains[context.gains.length - 1];

    source.end();
    instance.setVolume(0.5);
    instance.setRate(2);
    instance.setLoop(true);

    expect(instance.hasEnded).toBe(true);
    expect(instanceGain.gain.calls).toEqual([]);
    expect(source.playbackRate.calls).toEqual([]);
    expect(source.loop).toBe(false);
  });

  it('still validates changes once it has ended', () => {
    context.sources[0].end();

    expect(() => {
      instance.setVolume(-1);
    }).toThrow(/volume/);
    expect(() => {
      instance.setRate(0);
    }).toThrow(/rate/);
  });

  it("doesn't reconnect to a new bus once stopped", () => {
    const [, sfxGain, instanceGain] = context.gains;
    const music = mixer.createBus('music');

    instance.stop();
    instance.setBus(getBusInternals(music));

    expect(instanceGain.connections).toEqual(new Set([sfxGain]));
  });

  it('does nothing when stopped immediately a second time', () => {
    const [source] = context.sources;

    instance.stopImmediately();
    source.stopTime = null;
    instance.stopImmediately();

    expect(instance.hasEnded).toBe(true);
    expect(source.stopTime).toBeNull();
  });
});
