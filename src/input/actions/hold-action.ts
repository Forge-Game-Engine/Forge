import { InputAction } from '../input-action.js';
import { ForgeEvent } from '../../events/index.js';

/**
 * An action that represents a hold input, such as holding down a button or key.
 */
export class HoldAction implements InputAction {
  public readonly name: string;

  /** Event that is raised when the hold starts. */
  public readonly holdStartEvent: ForgeEvent;
  /** Event that is raised when the hold ends. */
  public readonly holdEndEvent: ForgeEvent;

  public inputGroup: string;

  private _held: boolean = false;

  /** Creates a new HoldAction.
   * @param inputGroup - The input group this action belongs to.
   * @param name - The name of the action.
   */
  constructor(name: string, inputGroup?: string) {
    this.name = name;

    this.holdStartEvent = new ForgeEvent('Hold Start Event');
    this.holdEndEvent = new ForgeEvent('Hold End Event');

    this.inputGroup = inputGroup ?? 'game';
  }

  /** Marks the action as being held and raises the hold start event. */
  public startHold(): void {
    this._held = true;
    this.holdStartEvent.raise();
  }

  /** Marks the action as not being held and raises the hold end event. */
  public endHold(): void {
    this._held = false;
    this.holdEndEvent.raise();
  }

  /** Gets whether the action is currently being held. */
  get isHeld(): boolean {
    return this._held;
  }
}
