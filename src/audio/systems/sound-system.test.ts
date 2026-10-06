import { beforeEach, describe, expect, it } from 'vitest';
import { createSoundEcsSystem } from './sound-system.js';
import { addSoundComponent, soundId } from '../components/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { createSoundMixer, SoundMixer } from '../sound-mixer.js';
import { MixerBus } from '../mixer-bus.js';
import { toAudioBus } from '../audio-bus.js';
import {
  createFakeSound,
  FakeAudioBufferSourceNode,
  FakeAudioContext,
  FakeGainNode,
  setUserActivation,
} from '../fake-audio-context.test-helper.js';

const gainOf = (source: FakeAudioBufferSourceNode): FakeGainNode => {
  const [gain] = source.connections;

  return gain as FakeGainNode;
};

describe('createSoundEcsSystem', () => {
  let context: FakeAudioContext;
  let mixer: SoundMixer;
  let sfx: MixerBus;
  let world: EcsWorld;
  let entity: number;

  beforeEach(() => {
    context = new FakeAudioContext();
    setUserActivation(true);
    mixer = createSoundMixer(context.asAudioContext());
    sfx = mixer.createBus('sfx');
    world = new EcsWorld();
    world.addSystem(createSoundEcsSystem());
    entity = world.createEntity();
  });

  it('starts a sound once', () => {
    const sound = createFakeSound();

    addSoundComponent(world, entity, { sound, bus: sfx, volume: 0.5 });
    world.update();
    world.update();

    expect(context.sources).toHaveLength(1);
    expect(context.sources[0].buffer).toBe(sound.buffer);
    expect(gainOf(context.sources[0]).gain.value).toBe(0.5);
  });

  it("doesn't start a paused sound until it's unpaused", () => {
    const component = addSoundComponent(world, entity, {
      sound: createFakeSound(),
      bus: sfx,
      paused: true,
    });

    world.update();
    expect(context.sources).toHaveLength(0);

    component.paused = false;
    world.update();

    expect(context.sources).toHaveLength(1);
    expect(context.sources[0].startedAt?.offset).toBe(0);
  });

  it('resumes from the paused position, scaled by rate', () => {
    const component = addSoundComponent(world, entity, {
      sound: createFakeSound(10),
      bus: sfx,
      rate: 2,
    });

    world.update();

    context.currentTime = 1;
    component.paused = true;
    world.update();

    expect(context.sources[0].stoppedAt).not.toBeNull();

    context.currentTime = 5;
    world.update();

    component.paused = false;
    world.update();

    expect(context.sources).toHaveLength(2);
    expect(context.sources[1].startedAt?.offset).toBe(2);
  });

  it('tracks the position across a rate change', () => {
    const component = addSoundComponent(world, entity, {
      sound: createFakeSound(10),
      bus: sfx,
    });

    world.update();

    context.currentTime = 1;
    component.rate = 3;
    world.update();

    expect(context.sources[0].playbackRate.value).toBe(3);

    context.currentTime = 2;
    component.paused = true;
    world.update();
    component.paused = false;
    world.update();

    expect(context.sources[1].startedAt?.offset).toBe(4);
  });

  it('wraps the paused position of a looping sound', () => {
    const component = addSoundComponent(world, entity, {
      sound: createFakeSound(2),
      bus: sfx,
      loop: true,
    });

    world.update();

    context.currentTime = 5;
    component.paused = true;
    world.update();
    component.paused = false;
    world.update();

    expect(context.sources[1].startedAt?.offset).toBe(1);
  });

  it('applies volume and loop changes to the playing sound', () => {
    const component = addSoundComponent(world, entity, {
      sound: createFakeSound(),
      bus: sfx,
    });

    world.update();

    component.volume = 0.2;
    component.loop = true;
    world.update();

    expect(context.sources).toHaveLength(1);
    expect(gainOf(context.sources[0]).gain.value).toBeCloseTo(0.2);
    expect(context.sources[0].loop).toBe(true);
  });

  it('moves the playing sound to a new bus without restarting it', () => {
    const music = mixer.createBus('music');
    const component = addSoundComponent(world, entity, {
      sound: createFakeSound(),
      bus: sfx,
    });

    world.update();

    component.bus = music;
    world.update();

    const gain = gainOf(context.sources[0]);

    expect(context.sources).toHaveLength(1);
    expect(gain.connections.has(toAudioBus(music).node as never)).toBe(true);
    expect(gain.connections.has(toAudioBus(sfx).node as never)).toBe(false);
  });

  it('throws when moved to a bus of another mixer', () => {
    const other = createSoundMixer(new FakeAudioContext().asAudioContext());
    const component = addSoundComponent(world, entity, {
      sound: createFakeSound(),
      bus: sfx,
    });

    world.update();

    component.bus = other.master;

    expect(() => world.update()).toThrow(/different mixers/);
  });

  it('restarts with a new sound', () => {
    const replacement = createFakeSound();
    const component = addSoundComponent(world, entity, {
      sound: createFakeSound(),
      bus: sfx,
    });

    world.update();

    component.sound = replacement;
    world.update();

    expect(context.sources[0].stoppedAt).not.toBeNull();
    expect(context.sources[1].buffer).toBe(replacement.buffer);
    expect(context.sources[1].startedAt?.offset).toBe(0);
  });

  it('sets hasFinished once a non-looping sound ends, and plays nothing more', () => {
    const component = addSoundComponent(world, entity, {
      sound: createFakeSound(),
      bus: sfx,
    });

    world.update();
    context.sources[0].end();
    world.update();

    expect(component.hasFinished).toBe(true);

    component.paused = true;
    world.update();
    component.paused = false;
    world.update();

    expect(context.sources).toHaveLength(1);
  });

  it('finishes a non-looping sound added before user input', () => {
    setUserActivation(false);

    const component = addSoundComponent(world, entity, {
      sound: createFakeSound(),
      bus: sfx,
    });

    world.update();

    expect(component.hasFinished).toBe(true);
    expect(context.sources).toHaveLength(0);
  });

  it('starts a looping sound added before user input', () => {
    setUserActivation(false);

    const component = addSoundComponent(world, entity, {
      sound: createFakeSound(),
      bus: sfx,
      loop: true,
    });

    world.update();

    expect(component.hasFinished).toBe(false);
    expect(context.sources).toHaveLength(1);
  });

  it('stops the sound when the component is removed', () => {
    addSoundComponent(world, entity, { sound: createFakeSound(), bus: sfx });
    world.update();

    world.removeComponent(entity, soundId);
    world.update();

    expect(context.sources[0].stoppedAt).not.toBeNull();
  });

  it('stops the sound when the entity is removed', () => {
    addSoundComponent(world, entity, { sound: createFakeSound(), bus: sfx });
    world.update();

    world.removeEntity(entity);
    world.update();

    expect(context.sources[0].stoppedAt).not.toBeNull();
  });

  it('stops every sound when the world stops, and plays again after', () => {
    const sound = createFakeSound();

    addSoundComponent(world, entity, { sound, bus: sfx, loop: true });
    world.update();

    world.stop();

    expect(context.sources[0].stoppedAt).not.toBeNull();

    const restarted = new EcsWorld();

    restarted.addSystem(createSoundEcsSystem());
    addSoundComponent(restarted, restarted.createEntity(), {
      sound,
      bus: sfx,
    });
    restarted.update();

    expect(context.sources[1].buffer).toBe(sound.buffer);
  });
});
