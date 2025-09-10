export type AnimationInputTypeNames = 'boolean' | 'number' | 'string';
export type AnimationInputType = boolean | number | string;

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
   * Registers a new toggle input.
   * @param name The name of the toggle input.
   * @param defaultValue The default value of the toggle input.
   */
  public registerToggle(
    name: string,
    defaultValue = false,
    resetOnFrameEnd = false,
  ): void {
    this._validateInputNameDoesNotExist(name);
    this.inputs.push(new AnimationInput(name, defaultValue, resetOnFrameEnd));
  }

  public setToggle(name: string, value: boolean): void {
    this._validateInputType(name, 'boolean');
    const input = this._getInput(name);
    input.value = value;
  }

  public getToggle(name: string): boolean {
    this._validateInputType(name, 'boolean');
    const input = this._getInput(name);

    return input.value as boolean;
  }

  public clearFrameEndInputs() {
    this.inputs.forEach((element) => {
      if (element.resetOnFrameEnd) {
        switch (typeof element.value) {
          case 'number':
            element.value = 0;

            break;
          case 'string':
            element.value = '';

            break;
          case 'boolean':
            element.value = false;

            break;
        }
      }
    });
  }

  /**
   * Registers a new number input.
   * @param name The name of the number input.
   * @param defaultValue The default value of the number input.
   */
  public registerNumber(
    name: string,
    defaultValue = 0,
    resetOnFrameEnd = false,
  ): void {
    this._validateInputNameDoesNotExist(name);
    this.inputs.push(new AnimationInput(name, defaultValue, resetOnFrameEnd));
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
  public registerText(
    name: string,
    defaultValue: string = '',
    resetOnFrameEnd = false,
  ): void {
    this._validateInputNameDoesNotExist(name);
    this.inputs.push(new AnimationInput(name, defaultValue, resetOnFrameEnd));
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
