import { describe, expect, it } from 'vitest';
import { MouseAxis1dBinding } from './mouse-axis1d-binding';
import { Axis1dAction } from '../../actions';

describe('MouseAxis1dBinding', () => {
  it('should create an instance with correct properties', () => {
    const mockAction = new Axis1dAction('testAxis1dAction', 'default');
    const binding = new MouseAxis1dBinding(mockAction);

    expect(binding.action).toBe(mockAction);
    expect(binding.displayText).toBe('mouse scroll');
  });
});
