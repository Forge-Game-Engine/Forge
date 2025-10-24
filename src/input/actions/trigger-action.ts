import { InputAction } from '../input-action.js';
import { ForgeEvent } from '../../events/index.js';
import { Resettable } from '../../common/index.js';

/**
 * An action that represents a trigger input, such as pressing a button or key.
 */
export class TriggerAction implements InputAction, Resettable {
  public readonly name: string;

  /** Event that is raised when the action is triggered. */
  public readonly triggerEvent: ForgeEvent;

  public inputGroup: string;

  private _triggered: boolean;

  /** Creates a new TriggerAction.
   * @param name - The name of the action.
   * @param inputGroup - The input group this action belongs to.
   */
  constructor(name: string, inputGroup: string) {
    this.name = name;

    this.triggerEvent = new ForgeEvent('Trigger Event');

    this._triggered = false;
    this.inputGroup = inputGroup;
  }

  /** Marks the action as triggered and raises the trigger event. */
  public trigger(): void {
    this._triggered = true;
    this.triggerEvent.raise();
  }

  /** Resets the action to not triggered. */
  public reset(): void {
    this._triggered = false;
  }

  /** Gets whether the action is currently triggered. */
  get isTriggered(): boolean {
    return this._triggered;
  }
}
