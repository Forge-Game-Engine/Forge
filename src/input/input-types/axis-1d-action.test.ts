import { beforeEach, describe, expect, it } from 'vitest';
import { InputAxis1d } from './axis-1d-action';

describe('InputAxis1d', () => {
  let axis: InputAxis1d;

  beforeEach(() => {
    axis = new InputAxis1d('zoom');
  });

  it('should initialize with the given name', () => {
    expect(axis.name).toBe('zoom');
  });

  it('should initialize value to 0', () => {
    expect(axis.value).toBe(0);
  });

  it('should set value correctly', () => {
    axis.set(0.5);
    expect(axis.value).toBe(0.5);

    axis.set(-1);
    expect(axis.value).toBe(-1);
  });

  it('should reset value to 0', () => {
    axis.set(1);
    expect(axis.value).toBe(1);

    axis.reset();
    expect(axis.value).toBe(0);
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
      displayText: 'A and D Keys',
    });

    expect(axis.bindings.length).toBe(2);
    expect(axis.bindings[1].bindingId).toBe('keyboard1');
    expect(axis.bindings[1].displayText).toBe('A and D Keys');
  });
});
