import { describe, expect, it, vi } from 'vitest';
import { AnimationSystem } from './animation-system';
import { Entity, World } from '../../ecs';
import { Time } from '../../common';
import { type AnimatedProperty, AnimationComponent } from '../components';

describe('AnimationSystem', () => {
  const world = new World('test-world');

  it('should update animations and call updateCallback', () => {
    const mockUpdateCallback = vi.fn();
    const mockFinishedCallback = vi.fn();
    const time = new Time();
    time.update(1000);

    const animation: Required<AnimatedProperty> = {
      startValue: 0,
      endValue: 1,
      elapsed: 0,
      duration: 1,
      updateCallback: mockUpdateCallback,
      easing: (t) => t,
      loop: 'none',
      loopCount: 1,
      finishedCallback: mockFinishedCallback,
    };

    const animationComponent = new AnimationComponent([animation]);
    const entity = new Entity('test', world, [animationComponent]);
    const animationSystem = new AnimationSystem(time);

    animationSystem.run(entity);

    expect(mockUpdateCallback).toHaveBeenCalledWith(1);
    expect(mockFinishedCallback).toHaveBeenCalled();
    expect(animationComponent.animations.length).toBe(0);
  });

  it('should handle looping animations', () => {
    const mockUpdateCallback = vi.fn();
    const time = new Time();
    time.update(1000);

    const animation: Required<AnimatedProperty> = {
      startValue: 0,
      endValue: 1,
      elapsed: 0,
      duration: 1000,
      updateCallback: mockUpdateCallback,
      easing: (t) => t,
      loop: 'loop',
      loopCount: 2,
      finishedCallback: () => void 0,
    };

    const animationComponent = new AnimationComponent([animation]);
    const entity = new Entity('test', world, [animationComponent]);
    const animationSystem = new AnimationSystem(time);

    animationSystem.run(entity);

    expect(mockUpdateCallback).toHaveBeenCalledWith(1);
    expect(animationComponent.animations.length).toBe(1);
    expect(animationComponent.animations[0].loopCount).toBe(1);
  });

  it('should handle pingpong animations', () => {
    const mockUpdateCallback = vi.fn();
    const time = new Time();
    time.update(1000);

    const animation: Required<AnimatedProperty> = {
      startValue: 0,
      endValue: 1,
      elapsed: 0,
      duration: 1000,
      updateCallback: mockUpdateCallback,
      easing: (t) => t,
      loop: 'pingpong',
      loopCount: 2,
      finishedCallback: () => void 0,
    };

    const animationComponent = new AnimationComponent([animation]);
    const entity = new Entity('test', world, [animationComponent]);
    const animationSystem = new AnimationSystem(time);

    animationSystem.run(entity);

    expect(mockUpdateCallback).toHaveBeenCalledWith(1);
    expect(animationComponent.animations.length).toBe(1);
    expect(animationComponent.animations[0].loopCount).toBe(1);
    expect(animationComponent.animations[0].startValue).toBe(1);
    expect(animationComponent.animations[0].endValue).toBe(0);
  });

  it('should remove animations when loopCount reaches 0', () => {
    const mockUpdateCallback = vi.fn();
    const time = new Time();
    time.update(1000);

    const animation: Required<AnimatedProperty> = {
      startValue: 0,
      endValue: 1,
      elapsed: 0,
      duration: 1000,
      updateCallback: mockUpdateCallback,
      easing: (t) => t,
      loop: 'none',
      loopCount: 1,
      finishedCallback: () => void 0,
    };

    const animationComponent = new AnimationComponent([animation]);
    const entity = new Entity('test', world, [animationComponent]);
    const animationSystem = new AnimationSystem(time);

    animationSystem.run(entity);

    expect(mockUpdateCallback).toHaveBeenCalledWith(1);
    expect(animationComponent.animations.length).toBe(0);
  });
});
