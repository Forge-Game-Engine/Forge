import { KeyCode } from '../constants';
import { InputManager } from '../input-manager';
import { Axis1dInputSource } from './axis-1d-input-source';
import { KeyboardAxis1dInteraction } from '../interactions/keyboard-axis1d-interaction';
import { Axis1dAction } from '../actions';

export class KeyboardAxis1dInputSource
  implements Axis1dInputSource<{ negativeKey: KeyCode; positiveKey: KeyCode }>
{
  private readonly _inputManager: InputManager;
  private _negativeKey: KeyCode;
  private _positiveKey: KeyCode;

  private readonly _keysdown = new Set<KeyCode>();

  private _boundAxis: Axis1dAction | null = null;

  constructor(
    inputManager: InputManager,
    negativeKey: KeyCode,
    positiveKey: KeyCode,
  ) {
    this._inputManager = inputManager;
    this._negativeKey = negativeKey;
    this._positiveKey = positiveKey;
    window.addEventListener('keydown', this._onKeyDownHandler);
    window.addEventListener('keyup', this._onKeyUpHandler);
  }

  public bindAxis1d(
    inputAxis: Axis1dAction,
    args: { negativeKey: KeyCode; positiveKey: KeyCode },
  ): void {
    this._boundAxis = inputAxis;
    this._negativeKey = args.negativeKey;
    this._positiveKey = args.positiveKey;
    console.log(this._negativeKey, this._positiveKey);
  }

  public stop(): void {
    window.removeEventListener('keydown', this._onKeyDownHandler);
    window.removeEventListener('keyup', this._onKeyUpHandler);
  }

  public reset(): void {
    this._keysdown.clear();
  }

  public update(): void {
    if (this._keysdown.size === 0 || !this._boundAxis) {
      return;
    }

    this._updateAxis();
  }

  get name() {
    return 'keyboard-axis1d';
  }

  private readonly _onKeyDownHandler = (event: KeyboardEvent) => {
    const key = event.code as KeyCode;

    if (key === this._negativeKey || key === this._positiveKey) {
      this._keysdown.add(key);
      this._updateAxis();
    }
  };

  private readonly _onKeyUpHandler = (event: KeyboardEvent) => {
    const key = event.code as KeyCode;

    if (key === this._negativeKey || key === this._positiveKey) {
      this._keysdown.delete(key);
      console.log(
        'Keys currently down after release:',
        Array.from(this._keysdown),
      );
      this._updateAxis();
    }
  };

  private _updateAxis(): void {
    if (!this._boundAxis) {
      console.warn('No Axis1dAction bound! Cannot dispatch value.');

      return;
    }

    const negativePressed = this._keysdown.has(this._negativeKey) ? -1 : 0;
    const positivePressed = this._keysdown.has(this._positiveKey) ? 1 : 0;
    const value = negativePressed + positivePressed;

    console.log(
      `Calculated Axis1d value: ${value} (negative: ${negativePressed}, positive: ${positivePressed})`,
    );

    const interaction = new KeyboardAxis1dInteraction(
      this,
      this._negativeKey,
      this._positiveKey,
    );

    this._inputManager.dispatchAxis1dAction(interaction, value);
  }
}
