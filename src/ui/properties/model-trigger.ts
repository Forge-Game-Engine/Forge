import { ForgeEvent } from '@forge-game-engine/forge';
import { ViewModelInstanceTrigger } from '@rive-app/webgl2';

export class ModelTrigger {
  public readonly onRaised: ForgeEvent;

  private readonly _trigger: ViewModelInstanceTrigger;

  constructor(trigger: ViewModelInstanceTrigger | null) {
    if (!trigger) {
      throw new Error('Trigger cannot be null');
    }

    this._trigger = trigger;

    this.onRaised = new ForgeEvent(`${trigger.name}Changed`);

    this._trigger.on(() => {
      this.onRaised.raise();
    });
  }
}
