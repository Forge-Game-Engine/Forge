/**
 * Defines the common options for an animation input.
 */
interface AnimationInputOptions<T> {
  /**
   * Whether the input should reset to its default value at the end of each animation frame.
   * @default false.
   */
  resetOnFrameEnd: boolean;
  /**
   * The default value of the input.
   * @default false or 0 or ''.
   */
  defaultValue: T;
}

const defaultTextInputOptions: AnimationInputOptions<string> = {
  resetOnFrameEnd: false,
  defaultValue: '',
};

const defaultNumberInputOptions: AnimationInputOptions<number> = {
  resetOnFrameEnd: false,
  defaultValue: 0,
};

const defaultToggleInputOptions: AnimationInputOptions<boolean> = {
  resetOnFrameEnd: false,
  defaultValue: false,
};

/**
 * Generic Class representing a single animation input with common values.
 */
export class AnimationInput<T> {
  /**
   * The name of the input.
   */
  public name: string;
  /**
   * The current value of the input.
   */
  public value: T;
  /**
   * The options for the input.
   */
  public options: AnimationInputOptions<T>;

  /**
   * Creates a new instance of AnimationInput.
   * @param name - the name of the input
   * @param options - the options for the input
   */
  constructor(name: string, options: AnimationInputOptions<T>) {
    this.name = name;
    this.value = options.defaultValue;
    this.options = options;
  }
}

/**
 * Class to store and manage all animation inputs used in the animation controller
 */
export class AnimationInputs {
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
   * Creates a new instance of AnimationInputs.
   * Initializes empty arrays for text, number, and toggle inputs.
   */
  constructor() {
    this.textInputs = [];
    this.numberInputs = [];
    this.toggleInputs = [];
  }

  /**
   * Registers a new toggle input.
   * @param name - the name of the input
   * @param inputOptions - the options for the input
   */
  public registerToggle(
    name: string,
    inputOptions?: Partial<AnimationInputOptions<boolean>>,
  ): void {
    this._registerInput(
      name,
      this.toggleInputs,
      defaultToggleInputOptions,
      inputOptions,
    );
  }

  /**
   * Sets the value of a toggle input.
   * @param name - the name of the input
   * @param value - the new value for the input
   */
  public setToggle(name: string, value: boolean): void {
    this._getInput<boolean>(name, this.toggleInputs).value = value;
  }

  /**
   * Gets the value of a toggle input.
   * @param name - the name of the input
   * @returns The current value of the input
   */
  public getToggle(name: string) {
    return this._getInput<boolean>(name, this.toggleInputs);
  }

  /**
   * Registers a new number input.
   * @param name - the name of the input
   * @param inputOptions - the options for the input
   */
  public registerNumber(
    name: string,
    inputOptions?: Partial<AnimationInputOptions<number>>,
  ): void {
    this._registerInput(
      name,
      this.numberInputs,
      defaultNumberInputOptions,
      inputOptions,
    );
  }

  /**
   * Sets the value of a number input.
   * @param name - the name of the input
   * @param value - the new value for the input
   */
  public setNumber(name: string, value: number) {
    this._getInput<number>(name, this.numberInputs).value = value;
  }

  /**
   * Gets the value of a number input.
   * @param name - the name of the input
   * @returns The current value of the input
   */
  public getNumber(name: string) {
    return this._getInput<number>(name, this.numberInputs);
  }

  /**
   * Registers a new text input.
   * @param name - the name of the input
   * @param inputOptions - the options for the input
   */
  public registerText(
    name: string,
    inputOptions?: Partial<AnimationInputOptions<string>>,
  ): void {
    this._registerInput(
      name,
      this.textInputs,
      defaultTextInputOptions,
      inputOptions,
    );
  }

  /**
   * Sets the value of a text input.
   * @param name - the name of the input
   * @param value - the new value for the input
   */
  public setText(name: string, value: string): void {
    this._getInput<string>(name, this.textInputs).value = value;
  }

  /**
   * Gets the value of a text input.
   * @param name - the name of the input
   * @returns The current value of the input
   */
  public getText(name: string) {
    return this._getInput<string>(name, this.textInputs);
  }

  /**
   * Gets all registered inputs.
   * @returns An array of all registered inputs of all types
   */
  public getAllInputs() {
    return [...this.toggleInputs, ...this.numberInputs, ...this.textInputs];
  }

  /**
   * Gets an input by name, regardless of its type.
   * @param name - the name of the input
   * @returns The input with the specified name
   */
  public getInputByName(
    name: string,
  ): AnimationInput<string> | AnimationInput<number> | AnimationInput<boolean> {
    const input =
      this.textInputs.find((input) => input.name === name) ||
      this.numberInputs.find((input) => input.name === name) ||
      this.toggleInputs.find((input) => input.name === name);

    if (!input) {
      throw new Error(`Input with name ${name} does not exist.`);
    }

    return input;
  }

  /**
   * Resets all inputs that are set to reset at the end of the animation frame to their default values.
   */
  public clearFrameEndInputs() {
    const inputs = this.getAllInputs();
    inputs.forEach((element) => {
      if (element.options.resetOnFrameEnd) {
        element.value = element.options.defaultValue;
      }
    });
  }

  /**
   * A generic method to register a new input of any type.
   * @param name - the name of the input
   * @param animationInputArray - the array to register the input in
   * @param defaultInputOptions - the default options for the input
   * @param inputOptions - any additional options for the input
   */
  private _registerInput<T>(
    name: string,
    animationInputArray: AnimationInput<T>[],
    defaultInputOptions: AnimationInputOptions<T>,
    inputOptions?: Partial<AnimationInputOptions<T>>,
  ) {
    if (animationInputArray.find((input) => input.name === name)) {
      throw new Error(`Input with name ${name} already exists.`);
    }

    const options = { ...defaultInputOptions, ...inputOptions };
    animationInputArray.push(new AnimationInput(name, options));
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
      throw new Error(`Input with name ${name} does not exist.`);
    }

    return input;
  }
}
