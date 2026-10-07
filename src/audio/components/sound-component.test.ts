import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import { createSoundMixer, SoundMixer } from '../sound-mixer.js';
import {
  createFakeSoundAsset,
  FakeAudioContext,
} from '../test-helpers/fake-audio-context.js';
import { addSoundComponent, soundId } from './sound-component.js';

describe('addSoundComponent', () => {
  let world: EcsWorld;
  let mixer: SoundMixer;

  beforeEach(() => {
    world = new EcsWorld();
    mixer = createSoundMixer(new FakeAudioContext().asAudioContext());
  });

  afterEach(async () => {
    await mixer.stop();
  });

  it('attaches a component with defaults applied', () => {
    const entity = world.createEntity();
    const sound = createFakeSoundAsset();

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
    const entity = world.createEntity();
    const sound = createFakeSoundAsset();

    addSoundComponent(world, entity, {
      sound,
      bus: mixer.master,
      volume: 0.3,
      loop: true,
    });

    expect(world.getComponent(entity, soundId)).toEqual({
      sound,
      bus: mixer.master,
      volume: 0.3,
      rate: 1,
      loop: true,
      paused: false,
      hasFinished: false,
    });
  });

  it('returns the attached component', () => {
    const entity = world.createEntity();

    const component = addSoundComponent(world, entity, {
      sound: createFakeSoundAsset(),
      bus: mixer.master,
    });

    expect(world.getComponent(entity, soundId)).toBe(component);
  });
});
