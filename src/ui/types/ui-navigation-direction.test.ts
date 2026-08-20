import { describe, expect, it } from 'vitest';
import { uiNavigationDirections } from './ui-navigation-direction.js';

describe('uiNavigationDirections', () => {
  it('maps every direction value to itself', () => {
    expect(uiNavigationDirections).toEqual({
      up: 'up',
      down: 'down',
      left: 'left',
      right: 'right',
    });
  });
});
