import { InputAction } from '../input-action.js';
import { ForgeEvent } from '../../events/index.js';

let writeHeld: (action: HoldAction, isHeld: boolean) => void;

/**
 * An action that represents a hold input, such as holding down a button or
 * key. Read-only to game code: its `InputManager` derives whether it's held
 * from what the input sources bound to it report.
 */
export class HoldAction implements InputAction {
  public readonly name: string;

  /** Event that is raised when the hold starts. */
  public readonly holdStartEvent: ForgeEvent;

  /** Event that is raised when the hold ends. */
  public readonly holdEndEvent: ForgeEvent;

  public readonly inputGroup: string;

  private _held: boolean = false;

  static {
    writeHeld = (action, isHeld): void => {
      if (action._held === isHeld) {
        return;
      }

      action._held = isHeld;

      if (isHeld) {
        action.holdStartEvent.raise();

        return;
      }

      action.holdEndEvent.raise();
    };
  }

  /** Creates a new HoldAction.
   * @param name - The name of the action.
   * @param inputGroup - The input group this action belongs to. Defaults to `'game'`.
   */
  constructor(name: string, inputGroup?: string) {
    this.name = name;
    this.holdStartEvent = new ForgeEvent('Hold Start Event');
    this.holdEndEvent = new ForgeEvent('Hold End Event');
    this.inputGroup = inputGroup ?? 'game';
  }

  /** Gets whether the action is currently being held. */
  get isHeld(): boolean {
    return this._held;
  }
}

/**
 * Starts or ends `action`'s hold, raising `holdStartEvent` or `holdEndEvent`
 * if it changed. Internal to the input module and not exported from it:
 * `InputManager` is the only writer of action state.
 * @param action - The action to write.
 * @param isHeld - Whether the action is held.
 */
export const setHoldActionHeld = (
  action: HoldAction,
  isHeld: boolean,
): void => {
  writeHeld(action, isHeld);
};
