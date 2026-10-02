import { describe, expect, it } from 'vitest';
import { GamepadHoldBinding } from './gamepad-hold-binding';
import { HoldAction } from '../../actions';
import { gamepadButtons } from '../../constants';

describe('GamepadHoldBinding', () => {
  it('stores its button and describes it', () => {
    const action = new HoldAction('shoot');
    const binding = new GamepadHoldBinding(action, gamepadButtons.rightTrigger);

    expect(binding.action).toBe(action);
    expect(binding.buttonIndex).toBe(gamepadButtons.rightTrigger);
    expect(binding.displayText).toBe('gamepad button 7 hold');
  });
});
