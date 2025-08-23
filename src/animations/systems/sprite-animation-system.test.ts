import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpriteAnimationSystem } from './sprite-animation-system';
import { createWorld, Entity, Game } from '../../ecs';
import { Time } from '../../common';
import { SpriteAnimationComponent } from '../components';
import { Sprite, SpriteComponent } from '../../rendering';
import {
  Animation,
  AnimationFrame,
  AnimationSetManager,
  immediatelySetCurrentAnimation,
} from '../utilities';
import { Vector2 } from '../../math';
import { ParameterizedForgeEvent } from '../../events';

describe('test running SpriteAnimationSystem', () => {
  let time: Time;
  let animationSetManager: AnimationSetManager;
  let spriteAnimationSystem: SpriteAnimationSystem;
  let entity: Entity;

  beforeEach(() => {
    time = new Time();
    animationSetManager = {
      getAnimation: vi.fn(),
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

  it('should throw an error if no animation is found', () => {
    vi.spyOn(animationSetManager, 'getAnimation').mockReturnValue(null);

    expect(() => spriteAnimationSystem.run(entity)).toThrow(
      'No animation found for animation set: testEntity, animation name: idle',
    );
  });

  it('should update the animation index and frame time when the frame duration is exceeded', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const mockAnimation: Animation = {
      frames: [animationFrame, animationFrame],
      nextAnimationName: 'run',
      animationEvents: new Map(),
      animationName: 'test',
    };
    vi.spyOn(animationSetManager, 'getAnimation').mockReturnValue(
      mockAnimation,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.frameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    spriteAnimationSystem.run(entity);

    expect(spriteAnimationComponent.animationIndex).toBe(1);
    expect(spriteAnimationComponent.frameTimeSeconds).toBe(2);
  });

  it('should reset the animation index and switch to the next animation set if available', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const mockAnimation: Animation = {
      frames: [animationFrame],
      nextAnimationName: 'run',
      animationEvents: new Map(),
      animationName: 'test',
    };

    vi.spyOn(animationSetManager, 'getAnimation').mockReturnValue(
      mockAnimation,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.frameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    spriteAnimationSystem.run(entity);

    expect(spriteAnimationComponent.animationIndex).toBe(0);
    expect(spriteAnimationComponent.frameTimeSeconds).toBe(2);
    expect(spriteAnimationComponent.animationName).toBe('run');
  });

  it('should call nextAnimation if nextAnimationSetName is set on the component', () => {
    const nextAnimationName = 'next';

    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const mockAnimation: Animation = {
      frames: [animationFrame],
      nextAnimationName,
      animationEvents: new Map(),
      animationName: 'test',
    };
    vi.spyOn(animationSetManager, 'getAnimation').mockReturnValue(
      mockAnimation,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.frameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;
    spriteAnimationComponent.nextAnimationName = nextAnimationName;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    spriteAnimationSystem.run(entity);

    expect(spriteAnimationComponent.animationIndex).toBe(0);
    expect(spriteAnimationComponent.frameTimeSeconds).toBe(2);
    expect(spriteAnimationComponent.animationName).toBe(nextAnimationName);
  });

  it('should not update animation index if frame duration has not been exceeded', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const mockAnimation: Animation = {
      frames: [animationFrame, animationFrame],
      nextAnimationName: 'run',
      animationEvents: new Map(),
      animationName: 'test',
    };
    vi.spyOn(animationSetManager, 'getAnimation').mockReturnValue(
      mockAnimation,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.frameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(0.5);

    spriteAnimationSystem.run(entity);

    expect(spriteAnimationComponent.animationIndex).toBe(0);
    expect(spriteAnimationComponent.frameTimeSeconds).toBe(0);
  });

  it('should reset animation index and not switch animation set if nextAnimationSetName is not set', () => {
    const animationFrame: AnimationFrame = {
      durationSeconds: 1,
      offset: new Vector2(0, 0),
      scale: new Vector2(1, 1),
    };

    const mockAnimation: Animation = {
      frames: [animationFrame],
      nextAnimationName: null,
      animationEvents: new Map(),
      animationName: 'test',
    };

    vi.spyOn(animationSetManager, 'getAnimation').mockReturnValue(
      mockAnimation,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.frameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    spriteAnimationSystem.run(entity);

    expect(spriteAnimationComponent.animationIndex).toBe(0);
    expect(spriteAnimationComponent.frameTimeSeconds).toBe(2);
    expect(spriteAnimationComponent.animationName).toBe('idle');
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

    const mockAnimation: Animation = {
      frames: [animationFrame, animationFrame],
      nextAnimationName: null,
      animationEvents: new Map([[0, event]]),
      animationName: 'test',
    };

    vi.spyOn(animationSetManager, 'getAnimation').mockReturnValue(
      mockAnimation,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.frameTimeSeconds = 0;
    immediatelySetCurrentAnimation(spriteAnimationComponent, 'idle');

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(2);

    spriteAnimationSystem.run(entity);

    expect(callback).toHaveBeenCalledWith(entity);
    expect(callback).toHaveBeenCalledTimes(1);
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

    const mockAnimation: Animation = {
      frames: [animationFrame],
      nextAnimationName: null,
      animationEvents: new Map([[0, event]]),
      animationName: 'test',
    };

    vi.spyOn(animationSetManager, 'getAnimation').mockReturnValue(
      mockAnimation,
    );

    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );
    spriteAnimationComponent.frameTimeSeconds = 0;
    spriteAnimationComponent.animationIndex = 0;

    vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(0.5);
    spriteAnimationSystem.run(entity);

    expect(callback).not.toHaveBeenCalled();
  });
});
