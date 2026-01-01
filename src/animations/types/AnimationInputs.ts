import { Updatable } from '../../common/index.js';

/**
 * Interface representing a single animation input
 */
export interface AnimationInput<T> {
  /**
   * The name of the input.
   */
  name: string;

  /**
   * The current value of the input.
   */
  value: T;
}

// TODO: Performance - Replace textInputs, numberInputs, toggleInputs, and triggerInputs with maps

/**
 * Class to store and manage all animation inputs used in the animation controller
 */
export class AnimationInputs implements Updatable {
  /**
   * An array of text inputs (string) used in the animation controller
   */
  public textInputs: AnimationInput<string>[];

  /**
   * An array of number inputs (number) used in the animation controller
   */
  public numberInputs: AnimationInput<number>[];

  /**
   * An array of toggle inputs (boolean) used in the animation controller
   */
  public toggleInputs: AnimationInput<boolean>[];

  /**
   * An array of trigger inputs (boolean) used in the animation controller
   */
  public triggerInputs: AnimationInput<boolean>[];

  /**
   * The current playback percentage of the animation clip (0 to 1)
   */
  public animationClipPlaybackPercentage: number = 0;

  /**
   * Creates a new instance of AnimationInputs.
   * Initializes empty arrays for text, number, and toggle inputs.
   */
  constructor() {
    this.textInputs = [];
    this.numberInputs = [];
    this.toggleInputs = [];
    this.triggerInputs = [];
  }

  public update(): void {
    for (const triggerInput of this.triggerInputs) {
      triggerInput.value = false;
    }
  }

  /**
   * Registers a new toggle input.
   * @param name - the name of the input
   * @param startingValue - the starting value for the input. Default is false.
   */
  public registerToggle(name: string, startingValue: boolean = false): void {
    this._registerInput(name, this.toggleInputs, startingValue);
  }

  /**
   * Sets the value of a toggle input.
   * @param name - the name of the input
   * @param value - the new value for the input
   */
  public setToggle(name: string, value: boolean): void {
    const toggle = this.getToggle(name);

    if (!toggle) {
      throw new Error(`Input with name ${name} does not exist.`);
    }

    toggle.value = value;
  }

  /**
   * Gets the value of a toggle input.
   * @param name - the name of the input
   * @returns The current value of the input
   */
  public getToggle(name: string): AnimationInput<boolean> | null {
    return this._getInput<boolean>(name, this.toggleInputs);
  }

  /**
   * Registers a new trigger input.
   * @param name - the name of the input
   */
  public registerTrigger(name: string): void {
    this._registerInput(name, this.triggerInputs, false);
  }

  /**
   * Sets the value of a trigger input to true.
   * @param name - the name of the input
   */
  public setTrigger(name: string): void {
    const trigger = this.getTrigger(name);

    if (!trigger) {
      throw new Error(`Input with name ${name} does not exist.`);
    }

    trigger.value = true;
  }

  /**
   * Gets the value of a trigger input.
   * @param name - the name of the input
   * @returns The current value of the input
   */
  public getTrigger(name: string): AnimationInput<boolean> | null {
    return this._getInput<boolean>(name, this.triggerInputs);
  }

  /**
   * Registers a new number input.
   * @param name - the name of the input
   * @param startingValue - the starting value for the input. Default is 0.
   */
  public registerNumber(name: string, startingValue: number = 0): void {
    this._registerInput(name, this.numberInputs, startingValue);
  }

  /**
   * Sets the value of a number input.
   * @param name - the name of the input
   * @param value - the new value for the input
   */
  public setNumber(name: string, value: number): void {
    const number = this.getNumber(name);

    if (!number) {
      throw new Error(`Input with name ${name} does not exist.`);
    }

    number.value = value;
  }

  /**
   * Gets the value of a number input.
   * @param name - the name of the input
   * @returns The current value of the input
   */
  public getNumber(name: string): AnimationInput<number> | null {
    return this._getInput<number>(name, this.numberInputs);
  }

  /**
   * Registers a new text input.
   * @param name - the name of the input
   * @param startingValue - the starting value for the input. Default is an empty string.
   */
  public registerText(name: string, startingValue: string = ''): void {
    this._registerInput(name, this.textInputs, startingValue);
  }

  /**
   * Sets the value of a text input.
   * @param name - the name of the input
   * @param value - the new value for the input
   */
  public setText(name: string, value: string): void {
    const text = this.getText(name);

    if (!text) {
      throw new Error(`Input with name ${name} does not exist.`);
    }

    text.value = value;
  }

  /**
   * Gets the value of a text input.
   * @param name - the name of the input
   * @returns The current value of the input
   */
  public getText(name: string): AnimationInput<string> | null {
    return this._getInput<string>(name, this.textInputs);
  }

  /**
   * A generic method to register a new input of any type.
   * @param name - the name of the input
   * @param animationInputArray - the array to register the input in
   * @param startingValue - the starting value for the input.
   */
  private _registerInput<T>(
    name: string,
    animationInputArray: AnimationInput<T>[],
    startingValue: T,
  ) {
    if (animationInputArray.some((input) => input.name === name)) {
      throw new Error(`Input with name ${name} already exists.`);
    }

    animationInputArray.push({ name, value: startingValue });
  }

  /**
   * A generic method to get an input of any type by name.
   * @param name - the name of the input
   * @param animationInputArray - the array to search for the input in
   * @returns The input with the specified name
   */
  private _getInput<T>(name: string, animationInputArray: AnimationInput<T>[]) {
    const input = animationInputArray.find((input) => input.name === name);

    if (!input) {
      return null;
    }

    return input;
  }
}
