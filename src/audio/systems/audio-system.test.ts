import { describe, expect, it, vi } from 'vitest';
import { createAnimationEcsSystem } from './audio-system';
import { type AudioEcsComponent, audioId } from '../components';
import { EcsWorld } from '../../new-ecs';

describe('createAnimationEcsSystem (Audio)', () => {
  it('should play sound when playSound is true', () => {
    const ecsWorld = new EcsWorld();
    const audioSystem = createAnimationEcsSystem();
    ecsWorld.addSystem(audioSystem);

    const entity = ecsWorld.createEntity();
    const mockPlay = vi.fn();
    const audioComponent: AudioEcsComponent = {
      sound: {
        play: mockPlay,
      } as any,
      playSound: true,
    };

    ecsWorld.addComponent(entity, audioId, audioComponent);
    ecsWorld.update();

    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(audioComponent.playSound).toBe(false);
  });

  it('should not play sound when playSound is false', () => {
    const ecsWorld = new EcsWorld();
    const audioSystem = createAnimationEcsSystem();
    ecsWorld.addSystem(audioSystem);

    const entity = ecsWorld.createEntity();
    const mockPlay = vi.fn();
    const audioComponent: AudioEcsComponent = {
      sound: {
        play: mockPlay,
      } as any,
      playSound: false,
    };

    ecsWorld.addComponent(entity, audioId, audioComponent);
    ecsWorld.update();

    expect(mockPlay).not.toHaveBeenCalled();
    expect(audioComponent.playSound).toBe(false);
  });

  it('should reset playSound to false after playing', () => {
    const ecsWorld = new EcsWorld();
    const audioSystem = createAnimationEcsSystem();
    ecsWorld.addSystem(audioSystem);

    const entity = ecsWorld.createEntity();
    const mockPlay = vi.fn();
    const audioComponent: AudioEcsComponent = {
      sound: {
        play: mockPlay,
      } as any,
      playSound: true,
    };

    ecsWorld.addComponent(entity, audioId, audioComponent);
    
    // First update should play the sound
    ecsWorld.update();
    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(audioComponent.playSound).toBe(false);

    // Second update should not play the sound
    ecsWorld.update();
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple entities with audio components', () => {
    const ecsWorld = new EcsWorld();
    const audioSystem = createAnimationEcsSystem();
    ecsWorld.addSystem(audioSystem);

    const entity1 = ecsWorld.createEntity();
    const mockPlay1 = vi.fn();
    const audioComponent1: AudioEcsComponent = {
      sound: {
        play: mockPlay1,
      } as any,
      playSound: true,
    };

    const entity2 = ecsWorld.createEntity();
    const mockPlay2 = vi.fn();
    const audioComponent2: AudioEcsComponent = {
      sound: {
        play: mockPlay2,
      } as any,
      playSound: false,
    };

    const entity3 = ecsWorld.createEntity();
    const mockPlay3 = vi.fn();
    const audioComponent3: AudioEcsComponent = {
      sound: {
        play: mockPlay3,
      } as any,
      playSound: true,
    };

    ecsWorld.addComponent(entity1, audioId, audioComponent1);
    ecsWorld.addComponent(entity2, audioId, audioComponent2);
    ecsWorld.addComponent(entity3, audioId, audioComponent3);
    
    ecsWorld.update();

    expect(mockPlay1).toHaveBeenCalledTimes(1);
    expect(mockPlay2).not.toHaveBeenCalled();
    expect(mockPlay3).toHaveBeenCalledTimes(1);
    expect(audioComponent1.playSound).toBe(false);
    expect(audioComponent2.playSound).toBe(false);
    expect(audioComponent3.playSound).toBe(false);
  });

  it('should allow re-triggering sound playback', () => {
    const ecsWorld = new EcsWorld();
    const audioSystem = createAnimationEcsSystem();
    ecsWorld.addSystem(audioSystem);

    const entity = ecsWorld.createEntity();
    const mockPlay = vi.fn();
    const audioComponent: AudioEcsComponent = {
      sound: {
        play: mockPlay,
      } as any,
      playSound: true,
    };

    ecsWorld.addComponent(entity, audioId, audioComponent);
    
    // First play
    ecsWorld.update();
    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(audioComponent.playSound).toBe(false);

    // Re-trigger the sound
    audioComponent.playSound = true;
    ecsWorld.update();
    expect(mockPlay).toHaveBeenCalledTimes(2);
    expect(audioComponent.playSound).toBe(false);
  });
});
