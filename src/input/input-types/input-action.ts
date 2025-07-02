import { Resettable } from '../../common';

export class InputAction implements Resettable {
  public readonly name: string;

  private _fired: boolean = false;

  constructor(name: string) {
    this.name = name;
  }

  public trigger() {
    this._fired = true;
  }

  public reset() {
    this._fired = false;
  }

  get fired(): boolean {
    return this._fired;
  }
}
