import { describe, expect, it } from 'vitest';
import { MouseAxis2dBinding } from './mouse-axis2d-binding';
import { Axis2dAction } from '../../actions';
import { cursorValueTypes } from '../../constants';

describe('MouseAxis2dBinding', () => {
  const mockAction = new Axis2dAction('testAxis2dAction', 'default');

  it('should create an instance with default options', () => {
    const binding = new MouseAxis2dBinding(mockAction);

    expect(binding.action).toBe(mockAction);
    expect(binding.displayText).toBe('mouse position');
    expect(binding.cursorValueType).toBe(cursorValueTypes.ratio);
    expect(binding.cursorOrigin).toEqual({ x: 0.5, y: 0.5 });
  });

  it('should use the provided cursorValueType', () => {
    const binding = new MouseAxis2dBinding(mockAction, {
      cursorValueType: cursorValueTypes.absolute,
    });

    expect(binding.cursorValueType).toBe(cursorValueTypes.absolute);
    expect(binding.cursorOrigin).toEqual({ x: 0.5, y: 0.5 });
  });

  it('should use the provided cursorOrigin', () => {
    const cursorOrigin = { x: 0, y: 1 };
    const binding = new MouseAxis2dBinding(mockAction, { cursorOrigin });

    expect(binding.cursorOrigin).toEqual(cursorOrigin);
    expect(binding.cursorValueType).toBe(cursorValueTypes.ratio);
  });
});
