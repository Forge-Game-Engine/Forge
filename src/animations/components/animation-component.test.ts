import { describe, expect, it } from 'vitest';
import { addAnimationComponent, animationId } from './animation-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addAnimationComponent', () => {
  it('attaches a component with an empty animations array by default', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addAnimationComponent(world, entity);

    expect(world.getComponent(entity, animationId)).toEqual({
      animations: [],
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const animations = [
      {
        startValue: 0,
        endValue: 1,
        elapsed: 0,
        duration: 1000,
        updateCallback: (): void => undefined,
        easing: (t: number): number => t,
        loop: 'none' as const,
        loopCount: -1,
        finishedCallback: (): void => undefined,
      },
    ];

    addAnimationComponent(world, entity, { animations });

    expect(world.getComponent(entity, animationId)).toEqual({ animations });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addAnimationComponent(world, entity);

    expect(world.getComponent(entity, animationId)).toBe(component);
  });

  it('gives each entity its own animations array instance', () => {
    const world = new EcsWorld();
    const first = world.createEntity();
    const second = world.createEntity();

    addAnimationComponent(world, first);
    addAnimationComponent(world, second);

    expect(world.getComponent(first, animationId)?.animations).not.toBe(
      world.getComponent(second, animationId)?.animations,
    );
  });
});
