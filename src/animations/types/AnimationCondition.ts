/*
Conditions:
    An optional list of conditions
    Each condition has a target input
    For triggers and toggles, the condition is true when the input is true
    For numbers, their is another option for greater than, less than, equal to
    For strings, the condition is true when the input is equal to the value

*/

import { AnimationInputType, AnimationInputTypeNames } from './AnimationInputs';

type AnimationConditionComparator = '<' | '<=' | '>' | '>=' | '=';

export class AnimationCondition {
  public inputType: AnimationInputTypeNames;
  public inputName: string;
  public inputConditionComparator: AnimationConditionComparator;
  public inputCondition: AnimationInputType;

  constructor(
    inputName: string,
    inputType: AnimationInputTypeNames,
    inputCondition?: AnimationInputType,
    inputConditionComparator: AnimationConditionComparator = '=',
  ) {
    this.inputName = inputName;
    this.inputType = inputType;
    this.inputConditionComparator = inputConditionComparator;

    if (inputCondition) {
      this.inputCondition = inputCondition;

      return;
    }

    switch (inputType) {
      case 'boolean':
        this.inputCondition = true;

        break;
      case 'number':
        this.inputCondition = 0;

        break;
      case 'string':
        this.inputCondition = '';

        break;
    }
  }

  public validateCondition(inputValue: AnimationInputType): boolean | null {
    if (typeof inputValue !== this.inputType) {
      return null;
    }

    switch (this.inputConditionComparator) {
      case '=':
        return inputValue === this.inputCondition;
      case '<':
        return inputValue < this.inputCondition;
      case '<=':
        return inputValue <= this.inputCondition;
      case '>':
        return inputValue > this.inputCondition;
      case '>=':
        return inputValue >= this.inputCondition;
    }
  }
}
