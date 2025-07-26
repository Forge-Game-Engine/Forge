import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageAnimationSystem } from './image-animation-system';
import { createWorld, Entity, Game } from '../../ecs';
import { Time } from '../../common';
import { ImageAnimationComponent } from '../components';
import { Sprite, SpriteComponent } from '../../rendering';
import {
  AnimationFrame,
  AnimationSet,
  SpriteAnimationManager,
} from './animation-manager-system';
import { Vector2 } from '../../math';

describe('test running ImageAnimationSystem', () => {
  let time: Time;
  let animationManager: SpriteAnimationManager;
  let imageAnimationSystem: ImageAnimationSystem;
  let entity: Entity;

  beforeEach(() => {
    time = new Time();
    animationManager = {
      getAnimationSet: vi.fn(),
    } as unknown as SpriteAnimationManager;

    imageAnimationSystem = new ImageAnimationSystem(time, animationManager);

    const game = new Game();

    const world = createWorld('world', game);

    entity = new Entity(
      'name',
      world,
      [
        new ImageAnimationComponent('testEntity', 'idle'),
        new SpriteComponent({} as Sprite),
      ],
      true,
    );
  });

  it('should throw an error if no animation set is found', () => {
    vi.spyOn(animationManager, 'getAnimationSet').mockReturnValue(null);

    expect(() => imageAnimationSystem.run(entity)).toThrow(
      'No animation set found for entity type: testEntity, animation: idle',
    );
  });

  it('should update the animation index and frame time when the frame duration is exceeded', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const mockAnimationSet: AnimationSet = {
      animationFrames: [animationFrame, animationFrame],
      numFrames: 2,
      nextAnimationSetName: 'run',
      animationCallbacks: new Map(),
    };
    vi.spyOn(animationManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );
    imageAnimationComponent.currentFrameTimeSeconds = 0;
    imageAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    imageAnimationSystem.run(entity);

    expect(imageAnimationComponent.animationIndex).toBe(1);
    expect(imageAnimationComponent.currentFrameTimeSeconds).toBe(2);
  });

  it('should reset the animation index and switch to the next animation set if available', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const mockAnimationSet: AnimationSet = {
      animationFrames: [animationFrame],
      numFrames: 1,
      nextAnimationSetName: 'run',
      animationCallbacks: new Map(),
    };

    vi.spyOn(animationManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );
    imageAnimationComponent.currentFrameTimeSeconds = 0;
    imageAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    imageAnimationSystem.run(entity);

    expect(imageAnimationComponent.animationIndex).toBe(0);
    expect(imageAnimationComponent.currentFrameTimeSeconds).toBe(2);
    expect(imageAnimationComponent.currentAnimationSetName).toBe('run');
  });

  it('should call nextAnimation if nextAnimationSetName is set on the component', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const mockAnimationSet: AnimationSet = {
      animationFrames: [animationFrame],
      numFrames: 1,
      nextAnimationSetName: 'run',
      animationCallbacks: new Map(),
    };
    vi.spyOn(animationManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );
    imageAnimationComponent.currentFrameTimeSeconds = 0;
    imageAnimationComponent.animationIndex = 0;
    imageAnimationComponent.nextAnimationSetName = 'jump';
    vi.spyOn(imageAnimationComponent, 'nextAnimation');

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    imageAnimationSystem.run(entity);

    expect(imageAnimationComponent.animationIndex).toBe(0);
    expect(imageAnimationComponent.currentFrameTimeSeconds).toBe(2);
    expect(imageAnimationComponent.nextAnimation).toHaveBeenCalled();
  });

  it('should not update animation index if frame duration has not been exceeded', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const mockAnimationSet: AnimationSet = {
      animationFrames: [animationFrame, animationFrame],
      numFrames: 2,
      nextAnimationSetName: 'run',
      animationCallbacks: new Map(),
    };
    vi.spyOn(animationManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );
    imageAnimationComponent.currentFrameTimeSeconds = 0;
    imageAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(0.5);

    imageAnimationSystem.run(entity);

    expect(imageAnimationComponent.animationIndex).toBe(0);
    expect(imageAnimationComponent.currentFrameTimeSeconds).toBe(0);
  });

  it('should reset animation index and not switch animation set if nextAnimationSetName is not set', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const mockAnimationSet: AnimationSet = {
      animationFrames: [animationFrame],
      numFrames: 1,
      nextAnimationSetName: null,
      animationCallbacks: new Map(),
    };

    vi.spyOn(animationManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );
    imageAnimationComponent.currentFrameTimeSeconds = 0;
    imageAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    imageAnimationSystem.run(entity);

    expect(imageAnimationComponent.animationIndex).toBe(0);
    expect(imageAnimationComponent.currentFrameTimeSeconds).toBe(2);
    expect(imageAnimationComponent.currentAnimationSetName).toBe('idle');
  });

  it('should call the correct callback for the current animation frame', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const callback = vi.fn();

    const mockAnimationSet: AnimationSet = {
      animationFrames: [animationFrame, animationFrame],
      numFrames: 2,
      nextAnimationSetName: null,
      animationCallbacks: new Map([[0, callback]]),
    };

    vi.spyOn(animationManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );
    imageAnimationComponent.currentFrameTimeSeconds = 0;
    imageAnimationComponent.setCurrentAnimation('idle');

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    imageAnimationSystem.run(entity);

    expect(callback).toHaveBeenCalledWith(entity);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should call multiple callbacks for the same frame index in the correct order', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const entityType = 'testEntity';
    const animationType = 'idle';
    const spritesPerColumn = 1;
    const spritesPerRow = 1;
    const frameDuration = 0.5;

    const animationManager = new SpriteAnimationManager();
    animationManager.createAnimationSet(
      entityType,
      animationType,
      spritesPerColumn,
      spritesPerRow,
      frameDuration,
      {
        animationCallbacks: [
          { percentage: 0, callback: callback1 },
          { percentage: 0, callback: callback2 },
        ],
      },
    );

    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );
    imageAnimationComponent.currentFrameTimeSeconds = 0;
    imageAnimationComponent.setCurrentAnimation(animationType);

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    imageAnimationSystem = new ImageAnimationSystem(time, animationManager);
    imageAnimationSystem.run(entity);

    expect(callback1).toHaveBeenCalledWith(entity);
    expect(callback2).toHaveBeenCalledWith(entity);
    expect(callback1).toHaveBeenCalledBefore(callback2);
  });

  it('should not call callbacks if the animation index has not changed', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const callback = vi.fn();

    const mockAnimationSet: AnimationSet = {
      animationFrames: [animationFrame],
      numFrames: 1,
      nextAnimationSetName: null,
      animationCallbacks: new Map([[0, callback]]),
    };

    vi.spyOn(animationManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );
    imageAnimationComponent.currentFrameTimeSeconds = 0;
    imageAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(0.5);
    imageAnimationSystem.run(entity);

    expect(callback).not.toHaveBeenCalled();
  });
});
