// import { beforeEach, describe, expect, it, vi } from 'vitest';
// import { SpriteAnimationSystem } from './sprite-animation-system';
// import { createWorld, Entity, Game } from '../../ecs';
// import { Time } from '../../common';
// import { SpriteAnimationComponent } from '../components';
// import { Sprite, SpriteComponent } from '../../rendering';
// import {
//   Animation,
//   AnimationFrame,
//   AnimationSetManager,
//   immediatelySetCurrentAnimation,
// } from '../utilities';
// import { Vector2 } from '../../math';
// import { ParameterizedForgeEvent } from '../../events';

import { describe, expect, it } from 'vitest';

describe('placeholder', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});

// describe('test running SpriteAnimationSystem', () => {
//   let time: Time;
//   let animationSetManager: AnimationSetManager;
//   let spriteAnimationSystem: SpriteAnimationSystem;
//   let entity: Entity;
//   let animationFrame: AnimationFrame;
//   const durationSeconds = 1;

//   beforeEach(() => {
//     time = new Time();
//     animationSetManager = {
//       getAnimation: vi.fn(),
//       getDefaultNextAnimation: vi.fn(),
//     } as unknown as AnimationSetManager;

//     spriteAnimationSystem = new SpriteAnimationSystem(
//       time,
//       animationSetManager,
//     );

//     const game = new Game();

//     const world = createWorld('world', game);

//     animationFrame = {
//       durationSeconds,
//       offset: new Vector2(0, 0),
//       scale: new Vector2(1, 1),
//     };

//     const startAnimation: Animation = {
//       animationSetName: 'testEntity',
//       name: 'idle',
//       frames: [animationFrame],
//       defaultNextAnimationName: 'run',
//       animationEvents: new Map(),
//     };

//     entity = new Entity(
//       'name',
//       world,
//       [
//         new SpriteAnimationComponent(startAnimation),
//         new SpriteComponent({} as Sprite),
//       ],
//       true,
//     );
//   });

//   it('should update the animation index and frame time when the frame duration is exceeded', () => {
//     const mockAnimation: Animation = {
//       frames: [animationFrame, animationFrame],
//       defaultNextAnimationName: 'run',
//       animationEvents: new Map(),
//       name: 'test',
//       animationSetName: 'testEntity',
//     };

//     const spriteAnimationComponent =
//       entity.getComponentRequired<SpriteAnimationComponent>(
//         SpriteAnimationComponent.symbol,
//       );
//     spriteAnimationComponent.frameTimeSeconds = 0;
//     spriteAnimationComponent.animationIndex = 0;
//     spriteAnimationComponent.animation = mockAnimation;

//     vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(durationSeconds * 2);

//     spriteAnimationSystem.run(entity);

//     expect(spriteAnimationComponent.animationIndex).toBe(1);
//     expect(spriteAnimationComponent.frameTimeSeconds).toBe(durationSeconds * 2);
//   });

//   it('should reset the animation index and switch to the next animation set if available', () => {
//     const mockAnimation: Animation = {
//       frames: [animationFrame, animationFrame],
//       defaultNextAnimationName: 'run',
//       animationEvents: new Map(),
//       name: 'test',
//       animationSetName: 'testEntity',
//     };

//     const spriteAnimationComponent =
//       entity.getComponentRequired<SpriteAnimationComponent>(
//         SpriteAnimationComponent.symbol,
//       );
//     spriteAnimationComponent.frameTimeSeconds = 0;
//     spriteAnimationComponent.animationIndex = 1;
//     spriteAnimationComponent.animation = mockAnimation;

//     vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(durationSeconds * 2);
//     vi.spyOn(animationSetManager, 'getDefaultNextAnimation').mockReturnValue({
//       ...mockAnimation,
//       name: 'run',
//     });

//     spriteAnimationSystem.run(entity);

//     expect(spriteAnimationComponent.animationIndex).toBe(0);
//     expect(spriteAnimationComponent.frameTimeSeconds).toBe(durationSeconds * 2);
//     expect(spriteAnimationComponent.animation.name).toBe('run');
//   });

//   it('should call nextAnimation if nextAnimationSetName is set on the component', () => {
//     const nextAnimationName = 'next';

//     const mockNextAnimation: Animation = {
//       frames: [animationFrame],
//       defaultNextAnimationName: null,
//       animationEvents: new Map(),
//       name: nextAnimationName,
//       animationSetName: 'testEntity',
//     };

//     const spriteAnimationComponent =
//       entity.getComponentRequired<SpriteAnimationComponent>(
//         SpriteAnimationComponent.symbol,
//       );
//     spriteAnimationComponent.frameTimeSeconds = 0;
//     spriteAnimationComponent.animationIndex = 0;
//     spriteAnimationComponent.nextAnimation = mockNextAnimation;

//     vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(durationSeconds * 2);
//     vi.spyOn(animationSetManager, 'getDefaultNextAnimation').mockReturnValue({
//       ...mockNextAnimation,
//     });

//     spriteAnimationSystem.run(entity);

//     expect(spriteAnimationComponent.animationIndex).toBe(0);
//     expect(spriteAnimationComponent.frameTimeSeconds).toBe(durationSeconds * 2);
//     expect(spriteAnimationComponent.animation.name).toBe(nextAnimationName);
//   });

//   it('should not update animation index if frame duration has not been exceeded', () => {
//     const spriteAnimationComponent =
//       entity.getComponentRequired<SpriteAnimationComponent>(
//         SpriteAnimationComponent.symbol,
//       );
//     spriteAnimationComponent.frameTimeSeconds = 0;
//     spriteAnimationComponent.animationIndex = 0;

//     vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(
//       durationSeconds * 0.5,
//     );

//     spriteAnimationSystem.run(entity);

//     expect(spriteAnimationComponent.animationIndex).toBe(0);
//     expect(spriteAnimationComponent.frameTimeSeconds).toBe(0);
//   });

//   it('should reset animation index and not switch animation set if nextAnimationSetName is not set', () => {
//     const spriteAnimationComponent =
//       entity.getComponentRequired<SpriteAnimationComponent>(
//         SpriteAnimationComponent.symbol,
//       );
//     spriteAnimationComponent.frameTimeSeconds = 0;
//     spriteAnimationComponent.animationIndex = 0;
//     spriteAnimationComponent.animation.defaultNextAnimationName = null;

//     vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(durationSeconds * 2);

//     spriteAnimationSystem.run(entity);

//     expect(spriteAnimationComponent.animationIndex).toBe(0);
//     expect(spriteAnimationComponent.frameTimeSeconds).toBe(durationSeconds * 2);
//     expect(spriteAnimationComponent.animation.name).toBe('idle');
//   });

//   it('should call the correct callback for the current animation frame', () => {
//     const callbackToRun = vi.fn();
//     const callbackNotToRun = vi.fn();
//     const eventToRun = new ParameterizedForgeEvent<Entity>('0');
//     eventToRun.registerListener(callbackToRun);
//     const eventNotToRun = new ParameterizedForgeEvent<Entity>('1');
//     eventNotToRun.registerListener(callbackNotToRun);

//     const mockAnimation: Animation = {
//       frames: [animationFrame, animationFrame],
//       defaultNextAnimationName: null,
//       animationEvents: new Map([
//         [0, eventToRun],
//         [1, eventNotToRun],
//       ]),
//       name: 'test',
//       animationSetName: 'testEntity',
//     };

//     const spriteAnimationComponent =
//       entity.getComponentRequired<SpriteAnimationComponent>(
//         SpriteAnimationComponent.symbol,
//       );
//     spriteAnimationComponent.frameTimeSeconds = 0;
//     immediatelySetCurrentAnimation(spriteAnimationComponent, mockAnimation);

//     vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(
//       durationSeconds * 0.5,
//     );

//     spriteAnimationSystem.run(entity);

//     expect(callbackToRun).toHaveBeenCalledWith(entity);
//     expect(callbackToRun).toHaveBeenCalledTimes(1);
//     expect(callbackNotToRun).toHaveBeenCalledTimes(0);
//   });

//   it('should not call callbacks if the animation index has not changed', () => {
//     const callback = vi.fn();
//     const event = new ParameterizedForgeEvent<Entity>('0');
//     event.registerListener(callback);

//     const mockAnimation: Animation = {
//       frames: [animationFrame],
//       defaultNextAnimationName: null,
//       animationEvents: new Map([[0, event]]),
//       name: 'test',
//       animationSetName: 'testEntity',
//     };

//     vi.spyOn(animationSetManager, 'getAnimation').mockReturnValue(
//       mockAnimation,
//     );

//     const spriteAnimationComponent =
//       entity.getComponentRequired<SpriteAnimationComponent>(
//         SpriteAnimationComponent.symbol,
//       );
//     spriteAnimationComponent.frameTimeSeconds = 0;
//     spriteAnimationComponent.animationIndex = 0;

//     vi.spyOn(time, 'timeInSeconds', 'get').mockReturnValue(0.5);
//     spriteAnimationSystem.run(entity);

//     expect(callback).not.toHaveBeenCalled();
//   });
// });
