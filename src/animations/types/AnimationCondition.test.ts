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
      'hello world',
      'equals',
    );
    expect(condition.satisfies(mockAnimationInputs)).toBe(true);

    const conditionFalse = new AnimationTextCondition(
      'input1',
      'wrong value',
      'equals',
    );
    expect(conditionFalse.satisfies(mockAnimationInputs)).toBe(false);
  });

  it('should validate "contains" condition correctly', () => {
    const condition = new AnimationTextCondition('input1', 'hello', 'contains');
    expect(condition.satisfies(mockAnimationInputs)).toBe(true);

    const conditionFalse = new AnimationTextCondition(
      'input1',
      'not here',
      'contains',
    );
    expect(conditionFalse.satisfies(mockAnimationInputs)).toBe(false);
  });

  it('should validate "isContainedIn" condition correctly', () => {
    const condition = new AnimationTextCondition(
      'input1',
      'hello world!',
      'isContainedIn',
    );
    expect(condition.satisfies(mockAnimationInputs)).toBe(true);

    const conditionFalse = new AnimationTextCondition(
      'input1',
      'hello',
      'isContainedIn',
    );
    expect(conditionFalse.satisfies(mockAnimationInputs)).toBe(false);
  });

  it('should validate "startsWith" condition correctly', () => {
    const condition = new AnimationTextCondition(
      'input1',
      'hello',
      'startsWith',
    );
    expect(condition.satisfies(mockAnimationInputs)).toBe(true);

    const conditionFalse = new AnimationTextCondition(
      'input1',
      'world',
      'startsWith',
    );
    expect(conditionFalse.satisfies(mockAnimationInputs)).toBe(false);
  });

  it('should validate "endsWith" condition correctly', () => {
    const condition = new AnimationTextCondition('input1', 'world', 'endsWith');
    expect(condition.satisfies(mockAnimationInputs)).toBe(true);

    const conditionFalse = new AnimationTextCondition(
      'input1',
      'hello',
      'endsWith',
    );
    expect(conditionFalse.satisfies(mockAnimationInputs)).toBe(false);
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
    expect(condition.satisfies(mockAnimationInputs)).toBe(true);

    const conditionFalse = new AnimationToggleCondition('toggle2');
    expect(conditionFalse.satisfies(mockAnimationInputs)).toBe(false);
  });

  it('should respect the toggle value', () => {
    const falseCondition = new AnimationToggleCondition('toggle1', true);
    expect(falseCondition.satisfies(mockAnimationInputs)).toBe(true);

    const trueCondition = new AnimationToggleCondition('toggle2', true);
    expect(trueCondition.satisfies(mockAnimationInputs)).toBe(false);
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
    const condition = new AnimationNumberCondition('number1', 10, 'equals');
    expect(condition.satisfies(mockAnimationInputs)).toBe(true);

    const conditionFalse = new AnimationNumberCondition('number1', 5, 'equals');
    expect(conditionFalse.satisfies(mockAnimationInputs)).toBe(false);
  });

  it('should validate "lessThan" condition correctly', () => {
    const condition = new AnimationNumberCondition('number2', 10, 'lessThan');
    expect(condition.satisfies(mockAnimationInputs)).toBe(true);

    const conditionFalse = new AnimationNumberCondition(
      'number1',
      5,
      'lessThan',
    );
    expect(conditionFalse.satisfies(mockAnimationInputs)).toBe(false);
  });

  it('should validate "lessThanOrEqual" condition correctly', () => {
    const condition = new AnimationNumberCondition(
      'number1',
      10,
      'lessThanOrEqual',
    );
    expect(condition.satisfies(mockAnimationInputs)).toBe(true);

    const conditionEqual = new AnimationNumberCondition(
      'number2',
      10,
      'lessThanOrEqual',
    );
    expect(conditionEqual.satisfies(mockAnimationInputs)).toBe(true);

    const conditionFalse = new AnimationNumberCondition(
      'number3',
      10,
      'lessThanOrEqual',
    );
    expect(conditionFalse.satisfies(mockAnimationInputs)).toBe(false);
  });

  it('should validate "greaterThan" condition correctly', () => {
    const condition = new AnimationNumberCondition(
      'number3',
      10,
      'greaterThan',
    );
    expect(condition.satisfies(mockAnimationInputs)).toBe(true);

    const conditionFalse = new AnimationNumberCondition(
      'number2',
      10,
      'greaterThan',
    );
    expect(conditionFalse.satisfies(mockAnimationInputs)).toBe(false);
  });

  it('should validate "greaterThanOrEqual" condition correctly', () => {
    const condition = new AnimationNumberCondition(
      'number1',
      10,
      'greaterThanOrEqual',
    );
    expect(condition.satisfies(mockAnimationInputs)).toBe(true);

    const conditionEqual = new AnimationNumberCondition(
      'number3',
      10,
      'greaterThanOrEqual',
    );
    expect(conditionEqual.satisfies(mockAnimationInputs)).toBe(true);

    const conditionFalse = new AnimationNumberCondition(
      'number2',
      10,
      'greaterThanOrEqual',
    );
    expect(conditionFalse.satisfies(mockAnimationInputs)).toBe(false);
  });
});
