import { HoldAction, InputsComponent, System, TriggerAction } from '../../src';

export class FireSystem extends System {
  private readonly _fireAction: TriggerAction;
  private readonly _runAction: HoldAction;

  constructor(fireAction: TriggerAction, runAction: HoldAction) {
    super([InputsComponent], 'FireSystem');

    this._fireAction = fireAction;
    this._runAction = runAction;
  }

  public run(): void {
    if (this._fireAction.isTriggered) {
      console.log(`Fire action triggered`);
    }

    if (this._runAction.isHeld) {
      console.log(`Run action is being held`);
    }
  }
}
