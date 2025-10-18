import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpriteAnimationSystem } from './sprite-animation-system';
import { createWorld, Entity, Game } from 'forge/ecs';
import { Time } from 'forge/common';
import { SpriteAnimationComponent } from 'forge/animations/components';
import { Sprite, SpriteComponent } from 'forge/rendering';
import {
  Animation,
  AnimationController,
  AnimationFrame,
  AnimationInputs,
} from '../types';

describe('SpriteAnimationSystem', () => {
  let time: Time;
  let system: SpriteAnimationSystem;
  let entity: Entity;
  let spriteAnimationComponent: SpriteAnimationComponent;
  let mockAnimation1: Animation;
  let mockAnimation2: Animation;

  function makeMockAnimation(name: string, numFrames: number): Animation {
    const mockFrames = [];

    for (let i = 0; i < numFrames; i++) {
      mockFrames.push({ frameIndex: i, durationSeconds: 1 } as AnimationFrame);
    }

    const animation = new Animation(name, mockFrames);
    animation.onAnimationEndEvent.raise = vi.fn();
    animation.onAnimationStartEvent.raise = vi.fn();
    animation.onAnimationFrameChangeEvent.raise = vi.fn();

    return animation;
  }

  beforeEach(() => {
    time = new Time();
    system = new SpriteAnimationSystem(time);

    mockAnimation1 = makeMockAnimation('TestAnimation1', 2);
    mockAnimation2 = makeMockAnimation('TestAnimation2', 2);

    spriteAnimationComponent = new SpriteAnimationComponent(
      {
        getEntryAnimation: vi.fn().mockReturnValue(mockAnimation1),
        findNextAnimation: vi.fn(),
      } as unknown as AnimationController,
      {} as AnimationInputs,
    );

    const game = new Game();

    const world = createWorld('world', game);

    entity = new Entity('entity', world, [
      spriteAnimationComponent,
      new SpriteComponent({} as Sprite),
    ]);
  });

  it('should not change frame if not enough time has passed', () => {
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(0.5);

    system.run(entity);

    expect(spriteAnimationComponent.animationFrameIndex).toBe(0);
  });

  it('should change frame if enough time has passed', () => {
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(1.5);

    system.run(entity);

    expect(spriteAnimationComponent.animationFrameIndex).toBe(1);
    expect(
      spriteAnimationComponent.currentAnimation.onAnimationFrameChangeEvent
        .raise,
    ).toHaveBeenCalled();
  });

  it('should switch to the next animation if one is found', () => {
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(1.5);
    spriteAnimationComponent.animationController.findNextAnimation = vi
      .fn()
      .mockReturnValue(mockAnimation2);

    expect(spriteAnimationComponent.currentAnimation).toBe(mockAnimation1);

    system.run(entity);

    expect(spriteAnimationComponent.currentAnimation).toBe(mockAnimation2);
    expect(mockAnimation2.onAnimationStartEvent.raise).toHaveBeenCalled();
  });

  it('should raise onAnimationEndEvent if the animation ends', () => {
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(1.5);
    spriteAnimationComponent.animationFrameIndex =
      spriteAnimationComponent.currentAnimation.frames.length - 1;
    spriteAnimationComponent.animationController.findNextAnimation = vi
      .fn()
      .mockReturnValue(mockAnimation2);

    system.run(entity);

    // we swap to the next animation, so the end event should be raised on the old one
    expect(mockAnimation1.onAnimationEndEvent.raise).toHaveBeenCalled();
    expect(spriteAnimationComponent.currentAnimation).toBe(mockAnimation2);
    expect(mockAnimation2.onAnimationStartEvent.raise).toHaveBeenCalled();
  });

  it('should not change frame if no next animation is found and not enough time has passed', () => {
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(0.5);
    spriteAnimationComponent.animationController.findNextAnimation = vi
      .fn()
      .mockReturnValue(null);

    system.run(entity);

    expect(spriteAnimationComponent.animationFrameIndex).toBe(0);
  });
  it('should change animations if one is found, even if not enough time has passed', () => {
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(0.5);
    spriteAnimationComponent.animationController.findNextAnimation = vi
      .fn()
      .mockReturnValue(mockAnimation2);

    expect(spriteAnimationComponent.currentAnimation).toBe(mockAnimation1);

    system.run(entity);

    expect(spriteAnimationComponent.currentAnimation).toBe(mockAnimation2);
    expect(mockAnimation2.onAnimationStartEvent.raise).toHaveBeenCalled();
  });

  it('should handle playback speed if speed is faster', () => {
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(0.5);
    spriteAnimationComponent.playbackSpeed = 2;

    expect(spriteAnimationComponent.currentAnimation).toBe(mockAnimation1);

    system.run(entity);

    expect(mockAnimation1.onAnimationFrameChangeEvent.raise).toHaveBeenCalled();
  });

  it('should handle playback speed if speed is slower', () => {
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(1.5);
    spriteAnimationComponent.playbackSpeed = 0.5;

    expect(spriteAnimationComponent.currentAnimation).toBe(mockAnimation1);

    system.run(entity);

    expect(
      mockAnimation1.onAnimationFrameChangeEvent.raise,
    ).not.toHaveBeenCalled();
  });

  it('should reset the animation index when swapping frames', () => {
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(1.5);
    spriteAnimationComponent.animationFrameIndex = 1;
    spriteAnimationComponent.animationController.findNextAnimation = vi
      .fn()
      .mockReturnValue(mockAnimation2);

    system.run(entity);

    expect(spriteAnimationComponent.animationFrameIndex).toBe(0);
  });

  it('should raise the frame change event with the next frame', () => {
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(1.5);
    spriteAnimationComponent.animationFrameIndex = 0;

    system.run(entity);

    expect(
      mockAnimation1.onAnimationFrameChangeEvent.raise,
    ).toHaveBeenCalledWith({
      entity: entity,
      animationFrame: mockAnimation1.frames[1],
    });
  });

  it('should correct work out if it is the end of the animation', () => {
    spriteAnimationComponent.animationFrameIndex = 0;

    // 1.5s in, we swap from frame 0 to frame 1
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(1.5);
    spriteAnimationComponent.animationController.findNextAnimation = vi
      .fn()
      .mockReturnValue(null);
    system.run(entity);

    expect(
      spriteAnimationComponent.animationController.findNextAnimation,
    ).toHaveBeenCalledWith(
      entity,
      mockAnimation1,
      spriteAnimationComponent.animationInputs,
      false,
    );

    // 1.9s in, we have not swapped frames
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(1.9);
    system.run(entity);

    expect(
      spriteAnimationComponent.animationController.findNextAnimation,
    ).toHaveBeenCalledWith(
      entity,
      mockAnimation1,
      spriteAnimationComponent.animationInputs,
      false,
    );

    // 3.5s in, we are at the end of the animation, and must get the next animation to swap to
    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(3.5);
    spriteAnimationComponent.animationController.findNextAnimation = vi
      .fn()
      .mockReturnValue(mockAnimation1);
    system.run(entity);

    expect(
      spriteAnimationComponent.animationController.findNextAnimation,
    ).toHaveBeenCalledWith(
      entity,
      mockAnimation1,
      spriteAnimationComponent.animationInputs,
      true,
    );
  });
});
