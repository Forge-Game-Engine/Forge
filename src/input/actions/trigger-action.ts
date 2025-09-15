import { InputAction } from '../input-action';
import { ForgeEvent } from '../../events';
import { Resettable } from '../../common';

export class TriggerAction implements InputAction, Resettable {
  public readonly name: string;
  public readonly triggerEvent: ForgeEvent;

  public inputGroup: string | null;

  private _triggered: boolean;

  constructor(name: string, inputGroup?: string) {
    this.name = name;

    this.triggerEvent = new ForgeEvent('Trigger Event');

    this._triggered = false;
    this.inputGroup = inputGroup ?? null;
  }

  public trigger() {
    this._triggered = true;
    this.triggerEvent.raise();
  }

  public reset() {
    this._triggered = false;
  }

  get isTriggered(): boolean {
    return this._triggered;
  }
}
