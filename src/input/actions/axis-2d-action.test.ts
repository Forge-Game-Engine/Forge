import { beforeEach, describe, expect, it } from 'vitest';
import { Axis2dAction } from './axis-2d-action';
import { Vector2 } from '../../math';

describe('Axis2dAction', () => {
  let axis: Axis2dAction;

  beforeEach(() => {
    axis = new Axis2dAction('pan');
    axis.reset();
  });

  it('should initialize with the given name', () => {
    expect(axis.name).toBe('pan');
  });

  it('should initialize value to zero vector', () => {
    expect(axis.value.x).toBe(0);
    expect(axis.value.y).toBe(0);
  });

  it('should set value using two numbers', () => {
    axis.set(3, 4);

    expect(axis.value.x).toBe(3);
    expect(axis.value.y).toBe(4);
  });

  it('should set value using a Vector2', () => {
    const vector = new Vector2(7, 8);
    axis.set(vector);

    expect(axis.value.x).toBe(7);
    expect(axis.value.y).toBe(8);
  });

  it('should reset value to zero', () => {
    axis.set(5, 6);
    axis.reset();

    expect(axis.value.x).toBe(0);
    expect(axis.value.y).toBe(0);
  });

  it('should update value when set multiple times', () => {
    axis.set(1, 2);

    expect(axis.value.x).toBe(1);
    expect(axis.value.y).toBe(2);

    axis.set(new Vector2(-1, -2));

    expect(axis.value.x).toBe(-1);
    expect(axis.value.y).toBe(-2);
  });

  it('should bind sources correctly', () => {
    axis.bind({
      bindingId: 'mouse1',
      sourceName: 'mouse',
      displayText: 'Mouse Position Delta',
    });

    expect(axis.bindings.length).toBe(1);
    expect(axis.bindings[0].bindingId).toBe('mouse1');
    expect(axis.bindings[0].displayText).toBe('Mouse Position Delta');

    axis.bind({
      bindingId: 'keyboard1',
      sourceName: 'keyboard',
      displayText: 'WASD Keys',
    });

    expect(axis.bindings.length).toBe(2);
    expect(axis.bindings[1].bindingId).toBe('keyboard1');
    expect(axis.bindings[1].displayText).toBe('WASD Keys');
  });
});
