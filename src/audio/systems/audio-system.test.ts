import { describe, expect, it, vi } from 'vitest';
import { Howl } from 'howler';
import { createAudioEcsSystem } from './audio-system';
import { type AudioEcsComponent, audioId } from '../components';
import { EcsWorld } from '../../new-ecs';

vi.mock(import('howler'), { spy: true });

describe('createAudioEcsSystem (Audio)', () => {
  it('should play sound when playSound is true', () => {
    const ecsWorld = new EcsWorld();
    const audioSystem = createAudioEcsSystem();
    ecsWorld.addSystem(audioSystem);

    const entity = ecsWorld.createEntity();
    const audioComponent: AudioEcsComponent = {
      sound: new Howl({
        src: ['test-sound.mp3'],
      }),
      playSound: true,
    };

    ecsWorld.addComponent(entity, audioId, audioComponent);
    ecsWorld.update();

    expect(audioComponent.sound.play).toHaveBeenCalledTimes(1);
    expect(audioComponent.playSound).toBe(false);
  });

  it('should not play sound when playSound is false', () => {
    const ecsWorld = new EcsWorld();
    const audioSystem = createAudioEcsSystem();
    ecsWorld.addSystem(audioSystem);

    const entity = ecsWorld.createEntity();
    const audioComponent: AudioEcsComponent = {
      sound: new Howl({
        src: ['test-sound.mp3'],
      }),
      playSound: false,
    };

    ecsWorld.addComponent(entity, audioId, audioComponent);
    ecsWorld.update();

    expect(audioComponent.sound.play).not.toHaveBeenCalled();
    expect(audioComponent.playSound).toBe(false);
  });

  it('should reset playSound to false after playing', () => {
    const ecsWorld = new EcsWorld();
    const audioSystem = createAudioEcsSystem();
    ecsWorld.addSystem(audioSystem);

    const entity = ecsWorld.createEntity();
    const audioComponent: AudioEcsComponent = {
      sound: new Howl({
        src: ['test-sound.mp3'],
      }),
      playSound: true,
    };

    ecsWorld.addComponent(entity, audioId, audioComponent);

    // First update should play the sound
    ecsWorld.update();
    expect(audioComponent.sound.play).toHaveBeenCalledTimes(1);
    expect(audioComponent.playSound).toBe(false);

    // Second update should not play the sound
    ecsWorld.update();
    expect(audioComponent.sound.play).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple entities with audio components', () => {
    const ecsWorld = new EcsWorld();
    const audioSystem = createAudioEcsSystem();
    ecsWorld.addSystem(audioSystem);

    const entity1 = ecsWorld.createEntity();
    const audioComponent1: AudioEcsComponent = {
      sound: new Howl({
        src: ['test-sound.mp3'],
      }),
      playSound: true,
    };

    const entity2 = ecsWorld.createEntity();
    const audioComponent2: AudioEcsComponent = {
      sound: new Howl({
        src: ['test-sound.mp3'],
      }),
      playSound: false,
    };

    const entity3 = ecsWorld.createEntity();
    const audioComponent3: AudioEcsComponent = {
      sound: new Howl({
        src: ['test-sound.mp3'],
      }),
      playSound: true,
    };

    ecsWorld.addComponent(entity1, audioId, audioComponent1);
    ecsWorld.addComponent(entity2, audioId, audioComponent2);
    ecsWorld.addComponent(entity3, audioId, audioComponent3);

    ecsWorld.update();

    expect(audioComponent1.sound.play).toHaveBeenCalledTimes(1);
    expect(audioComponent2.sound.play).not.toHaveBeenCalled();
    expect(audioComponent3.sound.play).toHaveBeenCalledTimes(1);
    expect(audioComponent1.playSound).toBe(false);
    expect(audioComponent2.playSound).toBe(false);
    expect(audioComponent3.playSound).toBe(false);
  });

  it('should allow re-triggering sound playback', () => {
    const ecsWorld = new EcsWorld();
    const audioSystem = createAudioEcsSystem();
    ecsWorld.addSystem(audioSystem);

    const entity = ecsWorld.createEntity();
    const audioComponent: AudioEcsComponent = {
      sound: new Howl({
        src: ['test-sound.mp3'],
      }),
      playSound: true,
    };

    ecsWorld.addComponent(entity, audioId, audioComponent);

    // First play
    ecsWorld.update();
    expect(audioComponent.sound.play).toHaveBeenCalledTimes(1);
    expect(audioComponent.playSound).toBe(false);

    // Re-trigger the sound
    audioComponent.playSound = true;
    ecsWorld.update();
    expect(audioComponent.sound.play).toHaveBeenCalledTimes(2);
    expect(audioComponent.playSound).toBe(false);
  });
});
