import { describe, expect, it } from 'vitest';
import { createAudioBus, getEffectiveBusVolume } from './audio-bus.js';

describe('createAudioBus', () => {
  it('creates an unmuted root bus at full volume by default', () => {
    expect(createAudioBus()).toEqual({ volume: 1, muted: false, parent: null });
  });

  it('overrides only the provided options', () => {
    const master = createAudioBus();

    expect(createAudioBus({ parent: master, volume: 0.25 })).toEqual({
      volume: 0.25,
      muted: false,
      parent: master,
    });
  });
});

describe('getEffectiveBusVolume', () => {
  it('is the bus volume for a root bus', () => {
    expect(getEffectiveBusVolume(createAudioBus({ volume: 0.4 }))).toBeCloseTo(
      0.4,
    );
  });

  it('multiplies the volumes of the bus and every ancestor', () => {
    const master = createAudioBus({ volume: 0.5 });
    const music = createAudioBus({ parent: master, volume: 0.5 });
    const ambience = createAudioBus({ parent: music, volume: 0.5 });

    expect(getEffectiveBusVolume(ambience)).toBe(0.125);
  });

  it('is 0 while the bus is muted', () => {
    expect(getEffectiveBusVolume(createAudioBus({ muted: true }))).toBe(0);
  });

  it('is 0 while an ancestor is muted, and recovers when it is unmuted', () => {
    const master = createAudioBus({ muted: true });
    const effects = createAudioBus({ parent: master, volume: 0.8 });

    expect(getEffectiveBusVolume(effects)).toBe(0);

    master.muted = false;

    expect(getEffectiveBusVolume(effects)).toBeCloseTo(0.8);
  });
});
