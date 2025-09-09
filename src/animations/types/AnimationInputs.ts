// export type InputType = 'trigger' | 'toggle' | 'number' | 'text';

export type AnimationInputTypeNames = 'boolean' | 'number' | 'string';
export type AnimationInputType = boolean | number | string;
/**
 * A set of animation inputs of a specific type.
 */
// class AnimationInputSet<T> {
//   public inputs: Map<string, T>;

//   constructor() {
//     this.inputs = new Map<string, T>();
//   }

//   /**
//    * Registers a new input with a default value.
//    * @param name The name of the input.
//    * @param defaultValue The default value of the input.
//    */
//   public register(name: string, defaultValue: T): void {
//     if (this.inputs.has(name)) {
//       throw new Error(
//         `Input with name ${name} of type ${typeof defaultValue} is already registered.`,
//       );
//     }

//     this.inputs.set(name, defaultValue);
//   }

//   /**
//    * Sets the value of an existing input.
//    * @param name The name of the input.
//    * @param value The new value of the input.
//    */
//   public set(name: string, value: T): void {
//     if (!this.inputs.has(name)) {
//       throw new Error(`Input with name ${name} is not registered.`);
//     }

//     this.inputs.set(name, value);
//   }

//   /**
//    *
//    * @param name
//    * @returns
//    */
//   public get(name: string): T {
//     const value = this.inputs.get(name);

//     if (!value) {
//       throw new Error(`Input with name ${name}  is not registered.`);
//     }

//     return value;
//   }

//   public *[Symbol.iterator]() {
//     yield* this.inputs.entries();
//   }
// }

export class AnimationInput {
  public name: string;
  public value: AnimationInputType;
  public resetOnFrameEnd: boolean;

  constructor(
    name: string,
    value: AnimationInputType,
    resetOnFrameEnd = false,
  ) {
    this.name = name;
    this.value = value;
    this.resetOnFrameEnd = resetOnFrameEnd;
  }
}

/**
 * A collection of animation inputs categorized by type.
 *
 * Triggers: boolean values that when set to true, resets to false after a single frame.
 * Toggles: boolean values.
 * Numbers: numeric values.
 * Text: string values.
 */
export class AnimationInputs {
  public inputs: AnimationInput[];

  /**
   * Creates a new instance of AnimationInputs.
   */
  constructor() {
    this.inputs = [];
  }

  /**
   * Registers a new trigger input.
   * @param name The name of the trigger input.
   * @param defaultValue The default value of the trigger input.
   */
  public registerTrigger(name: string, defaultValue = false): void {
    this._validateInputNameDoesNotExist(name);
    this.inputs.push(new AnimationInput(name, defaultValue, true));
  }

  public setTrigger(name: string, value: boolean = true): void {
    this._validateInputType(name, 'boolean');
    const input = this._getInput(name);
    input.value = value;
  }

  public getTrigger(name: string): boolean {
    this._validateInputType(name, 'boolean');
    const input = this._getInput(name);

    return input.value as boolean;
  }

  /**
   * Registers a new toggle input.
   * @param name The name of the toggle input.
   * @param defaultValue The default value of the toggle input.
   */
  public registerToggle(name: string, defaultValue = false): void {
    this._validateInputNameDoesNotExist(name);
    this.inputs.push(new AnimationInput(name, defaultValue));
  }

  public setToggle(name: string, value: boolean): void {
    this.setTrigger(name, value);
  }

  public getToggle(name: string): boolean {
    return this.getTrigger(name);
  }

  public resetTriggers() {
    this.inputs.forEach((element) => {
      if (element.resetOnFrameEnd) {
        element.value = false;
      }
    });
  }

  /**
   * Registers a new number input.
   * @param name The name of the number input.
   * @param defaultValue The default value of the number input.
   */
  public registerNumber(name: string, defaultValue = 0): void {
    this._validateInputNameDoesNotExist(name);
    this.inputs.push(new AnimationInput(name, defaultValue));
  }

  public setNumber(name: string, value: number): void {
    this._validateInputType(name, 'number');
    const input = this._getInput(name);
    input.value = value;
  }

  public getNumber(name: string): number {
    this._validateInputType(name, 'number');
    const input = this._getInput(name);

    return input.value as number;
  }

  /**
   * Registers a new text input.
   * @param name The name of the text input.
   * @param defaultValue The default value of the text input.
   */
  public registerText(name: string, defaultValue = ''): void {
    this._validateInputNameDoesNotExist(name);
    this.inputs.push(new AnimationInput(name, defaultValue));
  }

  public setText(name: string, value: string): void {
    this._validateInputType(name, 'string');
    const input = this._getInput(name);
    input.value = value;
  }

  public getText(name: string): string {
    this._validateInputType(name, 'string');
    const input = this._getInput(name);

    return input.value as string;
  }

  private _validateInputNameDoesNotExist(name: string) {
    if (this.inputs.find((input) => input.name === name)) {
      throw new Error(`Input with name ${name} already exists.`);
    }
  }

  private _validateInputType(name: string, type: AnimationInputTypeNames) {
    const input = this.inputs.find((input) => input.name === name);

    if (!input) {
      throw new Error(`Input with name ${name} does not exist.`);
    }

    if (typeof input.value !== type) {
      throw new Error(`Input with name ${name} is not of type ${type}.`);
    }
  }

  private _getInput(name: string): AnimationInput {
    const input = this.inputs.find((input) => input.name === name);

    if (!input) {
      throw new Error(`Input with name ${name} does not exist.`);
    }

    return input;
  }
}
