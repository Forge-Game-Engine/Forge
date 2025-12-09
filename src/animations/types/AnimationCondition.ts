import { AnimationInputs } from './AnimationInputs.js';

/**
 * Comparator types for number animation conditions.
 */
type AnimationConditionNumberComparator =
  | 'equals'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual';

/**
 * Comparator types for text animation conditions.
 */
type AnimationConditionTextComparator =
  | 'equals'
  | 'contains'
  | 'isContainedIn'
  | 'startsWith'
  | 'endsWith';

/**
 * Union type representing all possible animation conditions.
 */
export type AnimationCondition =
  | AnimationTextCondition
  | AnimationNumberCondition
  | AnimationToggleCondition;

/**
 * Base generic class for animation conditions.
 */
abstract class AnimationConditionBase<T> {
  /**
   * The name of the input used in the condition.
   */
  public inputName: string;
  /**
   * Whether to invert the condition result.
   */
  public invertCondition: boolean;

  /**
   * Creates an instance of AnimationConditionBase.
   * @param inputName - The name of the input used in the condition.
   * @param invertCondition - Whether to invert the condition result.
   */
  constructor(inputName: string, invertCondition?: boolean) {
    this.inputName = inputName;
    this.invertCondition = invertCondition ?? false;
  }

  /**
   * Abstract method to validate the condition based on all of the animation inputs.
   * @param animationInputs - The animation inputs to validate the condition against.
   * @returns Whether the condition is met based on the animation inputs.
   */
  public abstract validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean;

  /**
   * Validates the condition based on the input value and whether to invert the condition.
   * @param inputValue - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
  protected validateCondition(inputValue: T): boolean {
    return this.checkCondition(inputValue) !== this.invertCondition;
  }

  /**
   * Abstract method to check the condition based on the input value.
   * @param inputValue - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
  protected abstract checkCondition(inputValue: T): boolean;
}

/**
 * Abstract class for animation conditions with comparators.
 */
abstract class AnimationConditionWithComparator<
  T,
  C,
> extends AnimationConditionBase<T> {
  /**
   * The value to compare the condition against
   */
  public inputConditionValue: T;
  /**
   * The comparator operator used to compare against the input condition value
   */
  public inputConditionComparator: C;

  /**
   * Creates an instance of AnimationConditionWithComparator.
   * @param inputName - The name of the input used in the condition.
   * @param inputConditionComparator - The comparator used to compare against the input condition value.
   * @param inputConditionValue - The value to compare the condition against.
   * @param invertCondition - Whether to invert the condition result.
   */
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

/**
 * Class for text-based animation conditions.
 */
export class AnimationTextCondition extends AnimationConditionWithComparator<
  string,
  AnimationConditionTextComparator
> {
  /**
   * Method to validate the condition based on all of the animation inputs.
   * @param animationInputs - The animation inputs to validate the condition against.
   * @returns Whether the condition is met based on the animation inputs.
   */
  public validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean {
    const input = animationInputs.getText(this.inputName);

    return this.validateCondition(input.value);
  }

  /**
   * Method to check the condition based on the input value.
   * @param inputValue - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
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

/**
 * Class for number-based animation conditions.
 */
export class AnimationNumberCondition extends AnimationConditionWithComparator<
  number,
  AnimationConditionNumberComparator
> {
  /**
   * Method to validate the condition based on all of the animation inputs.
   * @param animationInputs - The animation inputs to validate the condition against.
   * @returns Whether the condition is met based on the animation inputs.
   */
  public validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean {
    const input = animationInputs.getNumber(this.inputName);

    return this.validateCondition(input.value);
  }

  /**
   * Method to check the condition based on the input value.
   * @param inputValue - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
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

/**
 * Class for toggle (boolean)-based animation conditions.
 */
export class AnimationToggleCondition extends AnimationConditionBase<boolean> {
  /**
   * Method to validate the condition based on all of the animation inputs.
   * @param animationInputs - The animation inputs to validate the condition against.
   * @returns Whether the condition is met based on the animation inputs.
   */
  public validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean {
    const input = animationInputs.getToggle(this.inputName);

    return this.validateCondition(input.value);
  }

  /**
   * Method to check the condition based on the input value.
   * @param inputValue - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
  protected checkCondition(inputValue: boolean): boolean {
    return inputValue === true;
  }
}

/**
 * Class for trigger (boolean)-based animation conditions.
 */
export class AnimationTriggerCondition extends AnimationConditionBase<boolean> {
  /**
   * Method to validate the condition based on all of the animation inputs.
   * @param animationInputs - The animation inputs to validate the condition against.
   * @returns Whether the condition is met based on the animation inputs.
   */
  public validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean {
    const input = animationInputs.getTrigger(this.inputName);

    return this.validateCondition(input.value);
  }

  /**
   * Method to check the condition based on the input value.
   * @param inputValue - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
  protected checkCondition(inputValue: boolean): boolean {
    return inputValue === true;
  }
}

export class AnimationExitTimeCondition extends AnimationConditionBase<number> {
  public readonly exitTime: number;

  constructor(
    inputName: string,
    exitTime: number = 1,
    invertCondition?: boolean,
  ) {
    super(inputName, invertCondition);
    this.exitTime = exitTime;
  }

  /**
   * Method to validate the condition based on all of the animation inputs.
   * @param animationInputs - The animation inputs to validate the condition against.
   * @returns Whether the condition is met based on the animation inputs.
   */
  public validateConditionFromInputs(
    animationInputs: AnimationInputs,
  ): boolean {
    const inputValue = animationInputs.animationClipPlaybackPercentage;

    return this.validateCondition(inputValue);
  }

  /**
   * Method to check the condition based on the input value.
   * @param inputValue - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
  protected checkCondition(inputValue: number): boolean {
    return inputValue >= this.exitTime;
  }
}
