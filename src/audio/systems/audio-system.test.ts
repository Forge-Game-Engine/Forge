import { describe, expect, it, vi } from 'vitest';
import { AudioSystem } from './audio-system';
import { Entity } from '../../ecs';
import { SoundComponent } from '../components';
import { Howl } from 'howler';

describe('AudioSystem', () => {
  it('should play sound if playSound is true', async () => {
    const mockPlay = vi.fn();
    const mockHowl = { play: mockPlay } as unknown as Howl;
    const soundComponent = new SoundComponent({ src: ['sound.mp3'] });
    soundComponent.sound = mockHowl;
    soundComponent.playSound = true;

    const entity = new Entity('test', [soundComponent]);
    const audioSystem = new AudioSystem();

    await audioSystem.run(entity);

    expect(mockPlay).toHaveBeenCalled();
    expect(soundComponent.playSound).toBe(false);
  });

  it('should not play sound if playSound is false', async () => {
    const mockPlay = vi.fn();
    const mockHowl = { play: mockPlay } as unknown as Howl;
    const soundComponent = new SoundComponent({ src: ['sound.mp3'] });
    soundComponent.sound = mockHowl;
    soundComponent.playSound = false;

    const entity = new Entity('test', [soundComponent]);
    const audioSystem = new AudioSystem();

    await audioSystem.run(entity);

    expect(mockPlay).not.toHaveBeenCalled();
  });
});
