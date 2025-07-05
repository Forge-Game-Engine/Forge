import { OrNull, Resettable } from '../../common';

interface InputBind {
  source: string;
  displayText: string;
}

export class InputAction implements Resettable {
  public readonly name: string;

  private _fired: boolean = false;
  private _bind: OrNull<InputBind>;

  constructor(name: string) {
    this.name = name;
    this._bind = null;
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

  public bindSource(bind: InputBind) {
    this._bind = bind;
  }

  get bind(): OrNull<InputBind> {
    return this._bind;
  }
}
