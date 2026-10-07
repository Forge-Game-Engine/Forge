import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import {
  addSoundComponent,
  SoundEcsComponent,
  soundId,
} from '../components/index.js';
import type { MixerBus } from '../mixer-bus.js';
import { createSoundMixer, SoundMixer } from '../sound-mixer.js';
import {
  createFakeSoundAsset,
  FakeAudioContext,
} from '../test-helpers/fake-audio-context.js';
import { createSoundEcsSystem } from './sound-system.js';

describe('createSoundEcsSystem', () => {
  let context: FakeAudioContext;
  let mixer: SoundMixer;
  let sfx: MixerBus;
  let world: EcsWorld;

  const addSound = (
    options: Partial<SoundEcsComponent> = {},
  ): { entity: number; component: SoundEcsComponent } => {
    const entity = world.createEntity();
    const component = addSoundComponent(world, entity, {
      sound: createFakeSoundAsset(),
      bus: sfx,
      ...options,
    });

    return { entity, component };
  };

  const instanceGainOf = (sourceIndex: number) =>
    [...context.sources[sourceIndex].connections][0] as unknown as {
      gain: { value: number };
      connections: Set<unknown>;
    };

  beforeEach(() => {
    context = new FakeAudioContext();
    mixer = createSoundMixer(context.asAudioContext());
    sfx = mixer.createBus('sfx');
    world = new EcsWorld();
    world.addSystem(createSoundEcsSystem());
    window.dispatchEvent(new Event('pointerup'));
  });

  afterEach(async () => {
    world.stop();
    await mixer.stop();
  });

  it('starts the sound once', () => {
    const { component } = addSound({ volume: 0.5, rate: 2, loop: true });

    world.update();
    world.update();

    expect(context.sources).toHaveLength(1);

    const [source] = context.sources;

    expect(source.buffer).toBe(component.sound.buffer);
    expect(source.loop).toBe(true);
    expect(source.playbackRate.value).toBe(2);
    expect(instanceGainOf(0).gain.value).toBe(0.5);
    expect(source.startCall).toEqual({ when: 0, offset: 0 });
  });

  it("doesn't start a paused sound until it's unpaused", () => {
    const { component } = addSound({ paused: true });

    world.update();

    expect(context.sources).toHaveLength(0);

    component.paused = false;
    world.update();

    expect(context.sources).toHaveLength(1);
  });

  it('resumes from where it was paused, scaled by the rate', () => {
    const { component } = addSound({ rate: 2 });

    world.update();
    context.currentTime = 0.4;
    component.paused = true;
    world.update();

    expect(context.sources[0].stopTime).not.toBeNull();

    context.currentTime = 5;
    component.paused = false;
    world.update();

    expect(context.sources[1].startCall?.offset).toBeCloseTo(0.8);
  });

  it('tracks the position across a rate change', () => {
    const { component } = addSound();

    world.update();
    context.currentTime = 0.5;
    component.rate = 2;
    world.update();
    context.currentTime = 0.75;
    component.paused = true;
    world.update();
    component.paused = false;
    world.update();

    expect(context.sources[1].startCall?.offset).toBeCloseTo(1);
  });

  it('wraps the resume position of a looping sound', () => {
    const { component } = addSound({
      sound: createFakeSoundAsset(2),
      loop: true,
    });

    world.update();
    context.currentTime = 5;
    component.paused = true;
    world.update();
    component.paused = false;
    world.update();

    expect(context.sources[1].startCall?.offset).toBeCloseTo(1);
  });

  it('applies volume, rate and loop changes to the playing sound', () => {
    const { component } = addSound();

    world.update();
    component.volume = 0.2;
    component.rate = 0.5;
    component.loop = true;
    world.update();

    const [source] = context.sources;

    expect(context.sources).toHaveLength(1);
    expect(instanceGainOf(0).gain.value).toBeCloseTo(0.2);
    expect(source.playbackRate.value).toBe(0.5);
    expect(source.loop).toBe(true);
  });

  it('moves the sound to a new bus without restarting it', () => {
    const music = mixer.createBus('music');
    const musicGain = context.gains[context.gains.length - 1];
    const { component } = addSound();

    world.update();
    const instanceGain = instanceGainOf(0);

    component.bus = music;
    world.update();

    expect(context.sources).toHaveLength(1);
    expect(instanceGain.connections).toEqual(new Set([musicGain]));
  });

  it('throws when the bus changes to one of a different mixer', async () => {
    const otherMixer = createSoundMixer(
      new FakeAudioContext('running').asAudioContext(),
    );
    const { component } = addSound();

    world.update();
    component.bus = otherMixer.master;

    expect(() => world.update()).toThrow(/different sound mixer/);

    await otherMixer.stop();
  });

  it('starts a new sound from the beginning when the sound changes', () => {
    const { component } = addSound();

    world.update();
    context.currentTime = 1;

    const newSound = createFakeSoundAsset();

    component.sound = newSound;
    world.update();

    expect(context.sources[0].stopTime).not.toBeNull();
    expect(context.sources[1].buffer).toBe(newSound.buffer);
    expect(context.sources[1].startCall?.offset).toBe(0);
  });

  it('reports a finished sound and plays nothing more', () => {
    const { component } = addSound();

    world.update();
    context.sources[0].end();
    world.update();

    expect(component.hasFinished).toBe(true);

    world.update();

    expect(context.sources).toHaveLength(1);
  });

  it('stops the sound when the component is removed', () => {
    const { entity } = addSound();

    world.update();
    world.removeComponent(entity, soundId);
    world.update();

    expect(context.sources[0].stopTime).not.toBeNull();
  });

  it('stops the sound when the entity is removed', () => {
    const { entity } = addSound();

    world.update();
    world.removeEntity(entity);
    world.update();

    expect(context.sources[0].stopTime).not.toBeNull();
  });

  it('plays a new component added after the previous one finished', () => {
    const { entity, component } = addSound();

    world.update();
    context.sources[0].end();
    world.update();

    expect(component.hasFinished).toBe(true);

    world.removeComponent(entity, soundId);
    addSoundComponent(world, entity, {
      sound: component.sound,
      bus: sfx,
    });
    world.update();

    expect(context.sources).toHaveLength(2);
  });

  it('stops every sound it started when the world stops', () => {
    addSound();
    addSound({ loop: true });

    world.update();
    world.stop();

    expect(context.sources.map((source) => source.stopTime)).not.toContain(
      null,
    );
  });

  it('reports a sound as finished when its mixer is stopped', async () => {
    const { component } = addSound({ loop: true });

    world.update();
    await mixer.stop();
    world.update();

    expect(component.hasFinished).toBe(true);
    expect(context.sources).toHaveLength(1);
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

    it('reports a non-looping sound as finished without playing it', () => {
      const { component } = addSound({ bus: lockedMixer.master });

      world.update();

      expect(component.hasFinished).toBe(true);
      expect(lockedContext.sources).toHaveLength(0);
    });

    it('starts a looping sound', () => {
      const { component } = addSound({ bus: lockedMixer.master, loop: true });

      world.update();

      expect(component.hasFinished).toBe(false);
      expect(lockedContext.sources).toHaveLength(1);
    });
  });
});
