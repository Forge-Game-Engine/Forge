export class InputAction {
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
