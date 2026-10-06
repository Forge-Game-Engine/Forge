import { describe, expect, it } from 'vitest';
import { addSoundComponent, soundId } from './sound-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { createSoundMixer } from '../sound-mixer.js';
import {
  createFakeSound,
  FakeAudioContext,
} from '../fake-audio-context.test-helper.js';

describe('addSoundComponent', () => {
  const mixer = createSoundMixer(new FakeAudioContext().asAudioContext());
  const sound = createFakeSound();

  it('attaches a component with defaults applied', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addSoundComponent(world, entity, { sound, bus: mixer.master });

    expect(world.getComponent(entity, soundId)).toEqual({
      sound,
      bus: mixer.master,
      volume: 1,
      rate: 1,
      loop: false,
      paused: false,
      hasFinished: false,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addSoundComponent(world, entity, {
      sound,
      bus: mixer.master,
      volume: 0.5,
      loop: true,
    });

    expect(world.getComponent(entity, soundId)).toMatchObject({
      volume: 0.5,
      rate: 1,
      loop: true,
      paused: false,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addSoundComponent(world, entity, {
      sound,
      bus: mixer.master,
    });

    expect(world.getComponent(entity, soundId)).toBe(component);
  });
});
