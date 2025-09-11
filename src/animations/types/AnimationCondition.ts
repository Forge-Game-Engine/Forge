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

abstract class AnimationConditionWithComparator<
  T,
  C,
> extends AnimationConditionBase<T> {
  public inputConditionValue: T;
  public inputConditionComparator: C;

  constructor(
    inputName: string,
    inputConditionComparator: C,
    inputConditionValue: T,
    invertCondition?: boolean,
  ) {
    super(inputName, invertCondition);
    this.inputConditionValue = inputConditionValue;
    this.inputConditionComparator = inputConditionComparator;
  }
}

export class AnimationTextCondition extends AnimationConditionWithComparator<
  string,
  AnimationConditionTextComparator
> {
  public validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean {
    const input = animationInputs.getText(this.inputName);

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

export class AnimationNumberCondition extends AnimationConditionWithComparator<
  number,
  AnimationConditionNumberComparator
> {
  public validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean {
    const input = animationInputs.getNumber(this.inputName);

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
    const input = animationInputs.getToggle(this.inputName);

    return this.validateCondition(input.value);
  }

  protected checkCondition(inputValue: boolean): boolean {
    return inputValue === true;
  }
}
