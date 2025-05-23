import { describe, expect, it, vi } from 'vitest';
import { AudioSystem } from './audio-system';
import { Entity, World } from '../../ecs';
import { SoundComponent } from '../components';
import { Howl } from 'howler';

describe('AudioSystem', () => {
  const world = new World();

  it('should play sound if playSound is true', () => {
    const mockPlay = vi.fn();
    const mockHowl = { play: mockPlay } as unknown as Howl;
    const soundComponent = new SoundComponent({ src: ['sound.mp3'] });
    soundComponent.sound = mockHowl;
    soundComponent.playSound = true;

    const entity = new Entity('test', world, [soundComponent]);
    const audioSystem = new AudioSystem();

    audioSystem.run(entity);

    expect(mockPlay).toHaveBeenCalled();
    expect(soundComponent.playSound).toBe(false);
  });

  it('should not play sound if playSound is false', () => {
    const mockPlay = vi.fn();
    const mockHowl = { play: mockPlay } as unknown as Howl;
    const soundComponent = new SoundComponent({ src: ['sound.mp3'] });
    soundComponent.sound = mockHowl;
    soundComponent.playSound = false;

    const entity = new Entity('test', world, [soundComponent]);
    const audioSystem = new AudioSystem();

    audioSystem.run(entity);

    expect(mockPlay).not.toHaveBeenCalled();
  });
});
