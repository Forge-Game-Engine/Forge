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

  public setToggle(name: string, value: boolean): void {
    this._getInput<boolean>(name, this.toggleInputs).value = value;
  }

  public getToggle(name: string) {
    return this._getInput<boolean>(name, this.toggleInputs);
  }

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

  public setNumber(name: string, value: number) {
    this._getInput<number>(name, this.numberInputs).value = value;
  }

  public getNumber(name: string) {
    return this._getInput<number>(name, this.numberInputs);
  }

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

  public setText(name: string, value: string): void {
    this._getInput<string>(name, this.textInputs).value = value;
  }

  public getText(name: string) {
    return this._getInput<string>(name, this.textInputs);
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

  public clearFrameEndInputs() {
    const inputs = this.getAllInputs();
    inputs.forEach((element) => {
      if (element.options.resetOnFrameEnd) {
        element.value = element.options.defaultValue;
      }
    });
  }

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

  private _getInput<T>(name: string, animationInputArray: AnimationInput<T>[]) {
    const input = animationInputArray.find((input) => input.name === name);

    if (!input) {
      throw new Error(`Input with name ${name} does not exist.`);
    }

    return input;
  }
}
