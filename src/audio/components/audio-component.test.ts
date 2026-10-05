import { Howl } from 'howler';
import { describe, expect, it, vi } from 'vitest';
import { addAudioComponent, audioId } from './audio-component.js';
import { EcsWorld } from '../../ecs/index.js';

vi.mock(import('howler'), { spy: true });

describe('addAudioComponent', () => {
  it('attaches a component with default playSound, volume and bus', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const sound = new Howl({ src: ['sound.mp3'] });

    addAudioComponent(world, entity, { sound });

    expect(world.getComponent(entity, audioId)).toEqual({
      sound,
      playSound: false,
      volume: 1,
      bus: null,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const sound = new Howl({ src: ['sound.mp3'] });

    addAudioComponent(world, entity, { sound, playSound: true, volume: 0.5 });

    expect(world.getComponent(entity, audioId)).toEqual({
      sound,
      playSound: true,
      volume: 0.5,
      bus: null,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const sound = new Howl({ src: ['sound.mp3'] });

    const component = addAudioComponent(world, entity, { sound });

    expect(world.getComponent(entity, audioId)).toBe(component);
  });
});
