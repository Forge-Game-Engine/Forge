import { describe, expect, it, vi } from 'vitest';
import { AudioSystem } from './audio-system';
import { Entity, World } from '../../ecs';
import { AudioComponent } from '../components';
import { Howl } from 'howler';

describe('AudioSystem', () => {
  const world = new World('test-world');

  it('should play audio if playSound is true', () => {
    const mockPlay = vi.fn();
    const mockHowl = { play: mockPlay } as unknown as Howl;
    const audioComponent = new AudioComponent({ src: ['sound.mp3'] });
    audioComponent.sound = mockHowl;
    audioComponent.playSound = true;

    const entity = new Entity(world, [audioComponent]);
    const audioSystem = new AudioSystem(world);

    audioSystem.run(entity);

    expect(mockPlay).toHaveBeenCalled();
    expect(audioComponent.playSound).toBe(false);
  });

  it('should not play audio if playSound is false', () => {
    const mockPlay = vi.fn();
    const mockHowl = { play: mockPlay } as unknown as Howl;
    const audioComponent = new AudioComponent({ src: ['sound.mp3'] });
    audioComponent.sound = mockHowl;
    audioComponent.playSound = false;

    const entity = new Entity(world, [audioComponent]);
    const audioSystem = new AudioSystem(world);

    audioSystem.run(entity);

    expect(mockPlay).not.toHaveBeenCalled();
  });
});
