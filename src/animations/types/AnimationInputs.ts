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
    this.inputs.push(new AnimationInput(name, defaultValue, true));
  }

  /**
   * Registers a new toggle input.
   * @param name The name of the toggle input.
   * @param defaultValue The default value of the toggle input.
   */
  public registerToggle(name: string, defaultValue = false): void {
    this.inputs.push(new AnimationInput(name, defaultValue));
  }

  /**
   * Registers a new number input.
   * @param name The name of the number input.
   * @param defaultValue The default value of the number input.
   */
  public registerNumber(name: string, defaultValue = 0): void {
    this.inputs.push(new AnimationInput(name, defaultValue));
  }

  /**
   * Registers a new text input.
   * @param name The name of the text input.
   * @param defaultValue The default value of the text input.
   */
  public registerText(name: string, defaultValue = ''): void {
    this.inputs.push(new AnimationInput(name, defaultValue));
  }
}
