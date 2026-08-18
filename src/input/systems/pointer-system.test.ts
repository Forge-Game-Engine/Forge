import { beforeEach, describe, expect, it } from 'vitest';
import { createPointerEcsSystem } from './pointer-system.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addPointerComponent,
  pointerId,
} from '../components/pointer-component.js';
import { PointerInputSource } from '../input-sources/pointer-input-source.js';
import { mouseButtons } from '../constants/index.js';

describe('createPointerEcsSystem', () => {
  let world: EcsWorld;
  let pointerSource: PointerInputSource;

  beforeEach(() => {
    world = new EcsWorld();

    pointerSource = {
      name: 'test-pointer',
      position: { x: 12, y: 34 },
      delta: { x: 1, y: -2 },
      scroll: 5,
      buttonsDown: new Set([mouseButtons.left]),
      buttonsHeld: new Set([mouseButtons.left]),
      buttonsUp: new Set(),
    };

    world.addSystem(createPointerEcsSystem(pointerSource));
  });

  it('copies the pointer source state into every pointer component', () => {
    const entity = world.createEntity();

    addPointerComponent(world, entity);

    world.update();

    expect(world.getComponent(entity, pointerId)).toEqual({
      position: { x: 12, y: 34 },
      delta: { x: 1, y: -2 },
      scroll: 5,
      buttonsDown: new Set([mouseButtons.left]),
      buttonsHeld: new Set([mouseButtons.left]),
      buttonsUp: new Set(),
    });
  });

  it('updates every pointer component independently on each tick', () => {
    const entity = world.createEntity();
    const component = addPointerComponent(world, entity);

    world.update();

    expect(component.position).toEqual({ x: 12, y: 34 });

    pointerSource.position.x = 100;
    pointerSource.position.y = 200;

    world.update();

    expect(component.position).toEqual({ x: 100, y: 200 });
  });

  it('does nothing when no entity has a pointer component', () => {
    expect(() => world.update()).not.toThrow();
  });
});
