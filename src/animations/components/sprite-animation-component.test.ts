import { describe, expect, it } from 'vitest';
import {
  addSpriteAnimationComponent,
  spriteAnimationId,
} from './sprite-animation-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addSpriteAnimationComponent', () => {
  it('attaches a component with default values for unspecified options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addSpriteAnimationComponent(world, entity, { animationClipHandle: 1 });

    expect(world.getComponent(entity, spriteAnimationId)).toEqual({
      animationFrameIndex: 0,
      playbackSpeed: 1,
      frameDurationMilliseconds: 100,
      lastFrameChangeTimeInSeconds: 0,
      animationClipHandle: 1,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addSpriteAnimationComponent(world, entity, {
      animationClipHandle: 2,
      playbackSpeed: 2,
    });

    expect(world.getComponent(entity, spriteAnimationId)).toEqual({
      animationFrameIndex: 0,
      playbackSpeed: 2,
      frameDurationMilliseconds: 100,
      lastFrameChangeTimeInSeconds: 0,
      animationClipHandle: 2,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addSpriteAnimationComponent(world, entity, {
      animationClipHandle: 3,
    });

    expect(world.getComponent(entity, spriteAnimationId)).toBe(component);
  });
});
