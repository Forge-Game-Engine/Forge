import { describe, expect, it } from 'vitest';
import { GamepadTriggerBinding } from './gamepad-trigger-binding';
import { TriggerAction } from '../../actions';
import { buttonMoments, gamepadButtons } from '../../constants';

describe('GamepadTriggerBinding', () => {
  it('stores its button and moment and describes them', () => {
    const action = new TriggerAction('restart');
    const binding = new GamepadTriggerBinding(
      action,
      gamepadButtons.start,
      buttonMoments.down,
    );

    expect(binding.action).toBe(action);
    expect(binding.buttonIndex).toBe(gamepadButtons.start);
    expect(binding.moment).toBe(buttonMoments.down);
    expect(binding.displayText).toBe('gamepad button 9 down');
  });
});
