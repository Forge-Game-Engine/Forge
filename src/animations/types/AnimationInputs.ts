interface AnimationInputOptions<T> {
  resetOnFrameEnd: boolean;
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

export class AnimationInput<T> {
  public name: string;
  public value: T;
  public options: AnimationInputOptions<T>;

  constructor(name: string, options: AnimationInputOptions<T>) {
    this.name = name;
    this.value = options.defaultValue;
    this.options = options;
  }
}

/**
 * A collection of animation inputs categorized by type.
 *
 * Toggles: boolean values.
 * Numbers: numeric values.
 * Text: string values.
 */
export class AnimationInputs {
  public textInputs: AnimationInput<string>[];
  public numberInputs: AnimationInput<number>[];
  public toggleInputs: AnimationInput<boolean>[];

  /**
   * Creates a new instance of AnimationInputs.
   */
  constructor() {
    this.textInputs = [];
    this.numberInputs = [];
    this.toggleInputs = [];
  }

  /**
   * Registers a new toggle input.
   * @param name The name of the toggle input.
   * @param defaultValue The default value of the toggle input.
   */
  public registerToggle(
    name: string,
    inputOptions?: Partial<AnimationInputOptions<boolean>>,
  ): void {
    this._validateInputNameDoesNotExist<boolean>(name, this.toggleInputs);
    const options = { ...defaultToggleInputOptions, ...inputOptions };
    this.toggleInputs.push(new AnimationInput(name, options));
  }

  public setToggle(name: string, value: boolean): void {
    const input = this._getInput<boolean>(name, this.toggleInputs);
    input.value = value;
  }

  public getToggle(name: string) {
    const input = this._getInput<boolean>(name, this.toggleInputs);

    return input;
  }

  /**
   * Registers a new number input.
   * @param name The name of the number input.
   * @param defaultValue The default value of the number input.
   */
  public registerNumber(
    name: string,
    inputOptions?: Partial<AnimationInputOptions<number>>,
  ): void {
    this._validateInputNameDoesNotExist<number>(name, this.numberInputs);
    const options = { ...defaultNumberInputOptions, ...inputOptions };
    this.numberInputs.push(new AnimationInput(name, options));
  }

  public setNumber(name: string, value: number) {
    const input = this._getInput<number>(name, this.numberInputs);
    input.value = value;
  }

  public getNumber(name: string) {
    const input = this._getInput<number>(name, this.numberInputs);

    return input;
  }

  /**
   * Registers a new text input.
   * @param name The name of the text input.
   * @param defaultValue The default value of the text input.
   */
  public registerText(
    name: string,
    inputOptions?: Partial<AnimationInputOptions<string>>,
  ): void {
    this._validateInputNameDoesNotExist<string>(name, this.textInputs);
    const options = { ...defaultTextInputOptions, ...inputOptions };
    this.textInputs.push(new AnimationInput(name, options));
  }

  public setText(name: string, value: string): void {
    const input = this._getInput<string>(name, this.textInputs);
    input.value = value;
  }

  public getText(name: string) {
    const input = this._getInput<string>(name, this.textInputs);

    return input;
  }

  public getAllInputs() {
    return [...this.toggleInputs, ...this.numberInputs, ...this.textInputs];
  }

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

  public getTextInputByName(name: string): AnimationInput<string> {
    const input = this.textInputs.find((input) => input.name === name);

    if (!input) {
      throw new Error(`Text input with name ${name} does not exist.`);
    }

    return input;
  }

  public getNumberInputByName(name: string): AnimationInput<number> {
    const input = this.numberInputs.find((input) => input.name === name);

    if (!input) {
      throw new Error(`Number input with name ${name} does not exist.`);
    }

    return input;
  }

  public getToggleInputByName(name: string): AnimationInput<boolean> {
    const input = this.toggleInputs.find((input) => input.name === name);

    if (!input) {
      throw new Error(`Toggle input with name ${name} does not exist.`);
    }

    return input;
  }

  public clearFrameEndInputs() {
    const inputs = this.getAllInputs();
    inputs.forEach((element) => {
      if (element.options.resetOnFrameEnd) {
        element.value = element.options.defaultValue;
      }
    });
  }

  private _validateInputNameDoesNotExist<T>(
    name: string,
    animationInputArray: AnimationInput<T>[],
  ) {
    if (animationInputArray.find((input) => input.name === name)) {
      throw new Error(`Input with name ${name} already exists.`);
    }
  }

  private _getInput<T>(name: string, animationInputArray: AnimationInput<T>[]) {
    const input = animationInputArray.find((input) => input.name === name);

    if (!input) {
      throw new Error(`Input with name ${name} does not exist.`);
    }

    return input;
  }
}
