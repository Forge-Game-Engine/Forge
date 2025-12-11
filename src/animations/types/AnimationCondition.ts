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
export interface AnimationCondition {
  name: string;
  satisfies(input: AnimationInputs): boolean;
}

const textConditionComparator = {
  equals: (input: string, value: string) => input === value,
  contains: (input: string, value: string) => input.includes(value),
  isContainedIn: (input: string, value: string) => value.includes(input),
  startsWith: (input: string, value: string) => input.startsWith(value),
  endsWith: (input: string, value: string) => input.endsWith(value),
};

/**
 * Class for text-based animation conditions.
 */
export class AnimationTextCondition implements AnimationCondition {
  public name: string;
  public text: string;
  private readonly _comparator: (input: string, value: string) => boolean;

  /**
   * Constructor for AnimationTextCondition.
   * @param name - The name of the condition.
   * @param text - The text value to compare against.
   * @param comparator - The comparator type to use for the condition.
   */
  constructor(
    name: string,
    text: string,
    comparator: AnimationConditionTextComparator,
  ) {
    this.name = name;
    this.text = text;
    this._comparator = textConditionComparator[comparator];
  }

  /**
   * Method to check the condition based on the input value.
   * @param inputs - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
  public satisfies(inputs: AnimationInputs): boolean {
    const animationInput = inputs.getText(this.name);

    if (!animationInput) {
      throw new Error(`Animation input with name "${this.name}" not found.`);
    }

    return this._comparator(animationInput.value, this.text);
  }
}

const numberConditionComparator = {
  equals: (input: number, value: number) => input === value,
  lessThan: (input: number, value: number) => input < value,
  lessThanOrEqual: (input: number, value: number) => input <= value,
  greaterThan: (input: number, value: number) => input > value,
  greaterThanOrEqual: (input: number, value: number) => input >= value,
};

/**
 * Class for number-based animation conditions.
 */
export class AnimationNumberCondition implements AnimationCondition {
  public name: string;
  public number: number;
  private readonly _comparator: (input: number, value: number) => boolean;

  constructor(
    name: string,
    number: number,
    comparator: AnimationConditionNumberComparator,
  ) {
    this.name = name;
    this.number = number;
    this._comparator = numberConditionComparator[comparator];
  }

  /**
   * Method to check the condition based on the input value.
   * @param inputs - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
  public satisfies(inputs: AnimationInputs): boolean {
    const input = inputs.getNumber(this.name);

    if (!input) {
      throw new Error(`Animation input with name "${this.name}" not found.`);
    }

    return this._comparator(input.value, this.number);
  }
}

/**
 * Class for toggle (boolean)-based animation conditions.
 */
export class AnimationToggleCondition implements AnimationCondition {
  public name: string;
  public toggleValue: boolean;

  constructor(name: string, toggleValue: boolean = true) {
    this.name = name;
    this.toggleValue = toggleValue;
  }

  /**
   * Method to check the condition based on the input value.
   * @param inputValue - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
  public satisfies(inputs: AnimationInputs): boolean {
    const input = inputs.getToggle(this.name);

    if (!input) {
      throw new Error(`Animation input with name "${this.name}" not found.`);
    }

    return input.value === this.toggleValue;
  }
}

/**
 * Class for trigger (boolean)-based animation conditions.
 */
export class AnimationTriggerCondition implements AnimationCondition {
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Method to check the condition based on the input value.
   * @param inputValue - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
  public satisfies(inputs: AnimationInputs): boolean {
    const input = inputs.getTrigger(this.name);

    if (!input) {
      throw new Error(`Animation input with name "${this.name}" not found.`);
    }

    return input.value === true;
  }
}

export class AnimationExitTimeCondition implements AnimationCondition {
  public name: string;

  public readonly exitTime: number;

  constructor(name: string, exitTime: number = 1) {
    this.name = name;
    this.exitTime = exitTime;
  }

  /**
   * Method to check the condition based on the input value.
   * @param inputValue - the value of the input to validate the condition against
   * @returns Whether the condition is met based on the input value.
   */
  public satisfies(inputs: AnimationInputs): boolean {
    return inputs.animationClipPlaybackPercentage >= this.exitTime;
  }
}
