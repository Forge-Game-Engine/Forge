import { describe, expect, it } from 'vitest';
import {
  AnimationNumberCondition,
  AnimationTextCondition,
  AnimationToggleCondition,
} from './AnimationCondition';
import { AnimationInputs } from './AnimationInputs';

describe('AnimationTextCondition', () => {
  const mockAnimationInputs = {
    getText: (inputName: string) => {
      const mockInputs: Record<string, { value: string }> = {
        input1: { value: 'hello world' },
        input2: { value: 'test' },
      };

      return mockInputs[inputName] || { value: '' };
    },
  } as AnimationInputs;

  it('should validate "equals" condition correctly', () => {
    const condition = new AnimationTextCondition(
      'input1',
      'equals',
      'hello world',
    );
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      true,
    );

    const conditionFalse = new AnimationTextCondition(
      'input1',
      'equals',
      'wrong value',
    );
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(false);
  });

  it('should validate "contains" condition correctly', () => {
    const condition = new AnimationTextCondition('input1', 'contains', 'hello');
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      true,
    );

    const conditionFalse = new AnimationTextCondition(
      'input1',
      'contains',
      'not here',
    );
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(false);
  });

  it('should validate "isContainedIn" condition correctly', () => {
    const condition = new AnimationTextCondition(
      'input1',
      'isContainedIn',
      'hello world!',
    );
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      true,
    );

    const conditionFalse = new AnimationTextCondition(
      'input1',
      'isContainedIn',
      'hello',
    );
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(false);
  });

  it('should validate "startsWith" condition correctly', () => {
    const condition = new AnimationTextCondition(
      'input1',
      'startsWith',
      'hello',
    );
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      true,
    );

    const conditionFalse = new AnimationTextCondition(
      'input1',
      'startsWith',
      'world',
    );
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(false);
  });

  it('should validate "endsWith" condition correctly', () => {
    const condition = new AnimationTextCondition('input1', 'endsWith', 'world');
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      true,
    );

    const conditionFalse = new AnimationTextCondition(
      'input1',
      'endsWith',
      'hello',
    );
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(false);
  });

  it('should respect the "invertCondition" flag', () => {
    const condition = new AnimationTextCondition(
      'input1',
      'equals',
      'hello world',
      true,
    );
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      false,
    );

    const conditionFalse = new AnimationTextCondition(
      'input1',
      'equals',
      'wrong value',
      true,
    );
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(true);
  });
});

describe('AnimationToggleCondition', () => {
  const mockAnimationInputs = {
    getToggle: (inputName: string) => {
      const mockInputs: Record<string, { value: boolean }> = {
        toggle1: { value: true },
        toggle2: { value: false },
      };

      return mockInputs[inputName] || { value: false };
    },
  } as AnimationInputs;

  it('should validate true condition correctly', () => {
    const condition = new AnimationToggleCondition('toggle1');
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      true,
    );

    const conditionFalse = new AnimationToggleCondition('toggle2');
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(false);
  });

  it('should respect the "invertCondition" flag', () => {
    const condition = new AnimationToggleCondition('toggle1', true);
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      false,
    );

    const conditionInverted = new AnimationToggleCondition('toggle2', true);
    expect(
      conditionInverted.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(true);
  });
});

describe('AnimationNumberCondition', () => {
  const mockAnimationInputs = {
    getNumber: (inputName: string) => {
      const mockInputs: Record<string, { value: number }> = {
        number1: { value: 10 },
        number2: { value: 5 },
        number3: { value: 15 },
      };

      return mockInputs[inputName] || { value: 0 };
    },
  } as AnimationInputs;

  it('should validate "equals" condition correctly', () => {
    const condition = new AnimationNumberCondition('number1', 'equals', 10);
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      true,
    );

    const conditionFalse = new AnimationNumberCondition('number1', 'equals', 5);
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(false);
  });

  it('should validate "lessThan" condition correctly', () => {
    const condition = new AnimationNumberCondition('number2', 'lessThan', 10);
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      true,
    );

    const conditionFalse = new AnimationNumberCondition(
      'number1',
      'lessThan',
      5,
    );
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(false);
  });

  it('should validate "lessThanOrEqual" condition correctly', () => {
    const condition = new AnimationNumberCondition(
      'number1',
      'lessThanOrEqual',
      10,
    );
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      true,
    );

    const conditionEqual = new AnimationNumberCondition(
      'number2',
      'lessThanOrEqual',
      10,
    );
    expect(
      conditionEqual.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(true);

    const conditionFalse = new AnimationNumberCondition(
      'number3',
      'lessThanOrEqual',
      10,
    );
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(false);
  });

  it('should validate "greaterThan" condition correctly', () => {
    const condition = new AnimationNumberCondition(
      'number3',
      'greaterThan',
      10,
    );
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      true,
    );

    const conditionFalse = new AnimationNumberCondition(
      'number2',
      'greaterThan',
      10,
    );
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(false);
  });

  it('should validate "greaterThanOrEqual" condition correctly', () => {
    const condition = new AnimationNumberCondition(
      'number1',
      'greaterThanOrEqual',
      10,
    );
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      true,
    );

    const conditionEqual = new AnimationNumberCondition(
      'number3',
      'greaterThanOrEqual',
      10,
    );
    expect(
      conditionEqual.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(true);

    const conditionFalse = new AnimationNumberCondition(
      'number2',
      'greaterThanOrEqual',
      10,
    );
    expect(
      conditionFalse.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(false);
  });

  it('should respect the "invertCondition" flag', () => {
    const condition = new AnimationNumberCondition(
      'number1',
      'equals',
      10,
      true,
    );
    expect(condition.validateConditionFromInputs(mockAnimationInputs)).toBe(
      false,
    );

    const conditionInverted = new AnimationNumberCondition(
      'number1',
      'equals',
      5,
      true,
    );
    expect(
      conditionInverted.validateConditionFromInputs(mockAnimationInputs),
    ).toBe(true);
  });
});
