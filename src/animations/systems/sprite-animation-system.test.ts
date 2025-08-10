import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpriteAnimationSystem } from './sprite-animation-system';
import { createWorld, Entity, Game } from '../../ecs';
import { Time } from '../../common';
import { SpriteAnimationComponent } from '../components';
import { Sprite, SpriteComponent } from '../../rendering';
import {
  AnimationFrame,
  AnimationSet,
  AnimationSetManager,
} from './animation-set-manager';
import { Vector2 } from '../../math';
import { ParameterizedForgeEvent } from '../../events';
import {
  immediatelySetCurrentAnimation,
  goToNextAnimation,
} from '../sprite-animation-helper';

// Mock the sprite animation helper module
vi.mock('../sprite-animation-helper', async () => {
  const actual = await vi.importActual('../sprite-animation-helper');

  return {
    ...actual,
    nextAnimation: vi.fn(),
  };
});

describe('test running SpriteAnimationSystem', () => {
  let time: Time;
  let animationSetManager: AnimationSetManager;
  let spriteAnimationSystem: SpriteAnimationSystem;
  let entity: Entity;

  beforeEach(() => {
    time = new Time();
    animationSetManager = {
      getAnimationSet: vi.fn(),
    } as unknown as AnimationSetManager;

    spriteAnimationSystem = new SpriteAnimationSystem(
      time,
      animationSetManager,
    );

    const game = new Game();

    const world = createWorld('world', game);

    entity = new Entity(
      'name',
      world,
      [
        new SpriteAnimationComponent('testEntity', 'idle'),
        new SpriteComponent({} as Sprite),
      ],
      true,
    );
  });

  it('should throw an error if no animation set is found', () => {
    vi.spyOn(animationSetManager, 'getAnimationSet').mockReturnValue(null);

    expect(() => spriteAnimationSystem.run(entity)).toThrow(
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
    vi.spyOn(animationSetManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.currentFrameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    spriteAnimationSystem.run(entity);

    expect(spriteAnimationComponent.animationIndex).toBe(1);
    expect(spriteAnimationComponent.currentFrameTimeSeconds).toBe(2);
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

    vi.spyOn(animationSetManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.currentFrameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    spriteAnimationSystem.run(entity);

    expect(spriteAnimationComponent.animationIndex).toBe(0);
    expect(spriteAnimationComponent.currentFrameTimeSeconds).toBe(2);
    expect(spriteAnimationComponent.currentAnimationSetName).toBe('run');
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
    vi.spyOn(animationSetManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.currentFrameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;
    spriteAnimationComponent.nextAnimationSetName = 'jump';

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    spriteAnimationSystem.run(entity);

    expect(spriteAnimationComponent.animationIndex).toBe(0);
    expect(spriteAnimationComponent.currentFrameTimeSeconds).toBe(2);
    expect(goToNextAnimation).toHaveBeenCalledWith(spriteAnimationComponent);
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
    vi.spyOn(animationSetManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.currentFrameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(0.5);

    spriteAnimationSystem.run(entity);

    expect(spriteAnimationComponent.animationIndex).toBe(0);
    expect(spriteAnimationComponent.currentFrameTimeSeconds).toBe(0);
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

    vi.spyOn(animationSetManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.currentFrameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    spriteAnimationSystem.run(entity);

    expect(spriteAnimationComponent.animationIndex).toBe(0);
    expect(spriteAnimationComponent.currentFrameTimeSeconds).toBe(2);
    expect(spriteAnimationComponent.currentAnimationSetName).toBe('idle');
  });

  it('should call the correct callback for the current animation frame', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const callback = vi.fn();
    const event = new ParameterizedForgeEvent<Entity>('0');
    event.registerListener(callback);

    const mockAnimationSet: AnimationSet = {
      animationFrames: [animationFrame, animationFrame],
      numFrames: 2,
      nextAnimationSetName: null,
      animationCallbacks: new Map([[0, event]]),
    };

    vi.spyOn(animationSetManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.currentFrameTimeSeconds = 0;
    immediatelySetCurrentAnimation(spriteAnimationComponent, 'idle');

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    spriteAnimationSystem.run(entity);

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

    const animationSetManager = new AnimationSetManager();
    animationSetManager.createAnimationSet(
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

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.currentFrameTimeSeconds = 0;
    immediatelySetCurrentAnimation(spriteAnimationComponent, animationType);

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    spriteAnimationSystem = new SpriteAnimationSystem(
      time,
      animationSetManager,
    );
    spriteAnimationSystem.run(entity);

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
    const event = new ParameterizedForgeEvent<Entity>('0');
    event.registerListener(callback);

    const mockAnimationSet: AnimationSet = {
      animationFrames: [animationFrame],
      numFrames: 1,
      nextAnimationSetName: null,
      animationCallbacks: new Map([[0, event]]),
    };

    vi.spyOn(animationSetManager, 'getAnimationSet').mockReturnValue(
      mockAnimationSet,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.currentFrameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(0.5);
    spriteAnimationSystem.run(entity);

    expect(callback).not.toHaveBeenCalled();
  });
});
