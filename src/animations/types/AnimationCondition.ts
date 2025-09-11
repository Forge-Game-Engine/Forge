/*
Conditions:
    An optional list of conditions
    Each condition has a target input
    For triggers and toggles, the condition is true when the input is true
    For numbers, their is another option for greater than, less than, equal to
    For strings, the condition is true when the input is equal to the value

*/

import { AnimationInputs } from './AnimationInputs';

type AnimationConditionNumberComparator =
  | 'equals'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual';

type AnimationConditionTextComparator =
  | 'equals'
  | 'contains'
  | 'isContainedIn'
  | 'startsWith'
  | 'endsWith';

export type AnimationCondition =
  | AnimationTextCondition
  | AnimationNumberCondition
  | AnimationToggleCondition;

abstract class AnimationConditionBase<T> {
  public inputName: string;
  public invertCondition: boolean;

  constructor(inputName: string, invertCondition?: boolean) {
    this.inputName = inputName;
    this.invertCondition = invertCondition ?? false;
  }

  public abstract validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean;

  protected validateCondition(inputValue: T): boolean {
    return this.checkCondition(inputValue) !== this.invertCondition;
  }

  protected abstract checkCondition(inputValue: T): boolean;
}

export class AnimationTextCondition extends AnimationConditionBase<string> {
  public inputConditionValue: string;
  public inputConditionComparator: AnimationConditionTextComparator;

  constructor(
    inputName: string,
    inputConditionComparator: AnimationConditionTextComparator,
    inputConditionValue: string,
    invertCondition?: boolean,
  ) {
    super(inputName, invertCondition);
    this.inputConditionValue = inputConditionValue;
    this.inputConditionComparator = inputConditionComparator ?? 'equals';
  }

  public validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean {
    const input = animationInputs.getTextInputByName(this.inputName);

    return this.validateCondition(input.value);
  }

  protected checkCondition(inputValue: string): boolean {
    const conditionComparator = {
      equals: () => inputValue === this.inputConditionValue,
      contains: () => inputValue.includes(this.inputConditionValue),
      isContainedIn: () => this.inputConditionValue.includes(inputValue),
      startsWith: () => inputValue.startsWith(this.inputConditionValue),
      endsWith: () => inputValue.endsWith(this.inputConditionValue),
    };

    return conditionComparator[this.inputConditionComparator]();
  }
}

export class AnimationNumberCondition extends AnimationConditionBase<number> {
  public inputConditionValue: number;
  public inputConditionComparator: AnimationConditionNumberComparator;

  constructor(
    inputName: string,
    inputConditionComparator: AnimationConditionNumberComparator,
    inputConditionValue: number,
    invertCondition?: boolean,
  ) {
    super(inputName, invertCondition);
    this.inputConditionValue = inputConditionValue;
    this.inputConditionComparator = inputConditionComparator ?? 'equals';
  }

  public validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean {
    const input = animationInputs.getNumberInputByName(this.inputName);

    return this.validateCondition(input.value);
  }

  protected checkCondition(inputValue: number): boolean {
    const conditionComparator = {
      equals: () => inputValue === this.inputConditionValue,
      lessThan: () => inputValue < this.inputConditionValue,
      lessThanOrEqual: () => inputValue <= this.inputConditionValue,
      greaterThan: () => inputValue > this.inputConditionValue,
      greaterThanOrEqual: () => inputValue >= this.inputConditionValue,
    };

    return conditionComparator[this.inputConditionComparator]();
  }
}

export class AnimationToggleCondition extends AnimationConditionBase<boolean> {
  public validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean {
    const input = animationInputs.getToggleInputByName(this.inputName);

    return this.validateCondition(input.value);
  }

  protected checkCondition(inputValue: boolean): boolean {
    return inputValue === true;
  }
}
