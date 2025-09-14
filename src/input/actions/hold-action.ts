import { InputAction } from './input-action';
import { ForgeEvent } from '../../events';

export class HoldAction implements InputAction {
  public readonly name: string;
  public readonly holdStartEvent: ForgeEvent;
  public readonly holdEndEvent: ForgeEvent;

  public inputGroup: string | null;

  private _held: boolean = false;

  constructor(name: string, inputGroup?: string) {
    this.name = name;

    this.holdStartEvent = new ForgeEvent('Hold Start Event');
    this.holdEndEvent = new ForgeEvent('Hold End Event');

    this.inputGroup = inputGroup ?? null;
  }

  public startHold() {
    this._held = true;
    this.holdStartEvent.raise();
  }

  public endHold() {
    this._held = false;
    this.holdEndEvent.raise();
  }

  get isHeld(): boolean {
    return this._held;
  }
}
