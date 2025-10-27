import Rive from '@rive-app/webgl2';
import { ForgeEvent } from '../../events/index.js';

/**
 * Represents a model trigger that can be used in a view model.
 * This class encapsulates a Rive trigger instance and provides an event
 * that is raised whenever the trigger is activated.
 */
export class ModelTrigger {
  /**
   * Event that is raised when the trigger is activated.
   */
  public readonly onRaised: ForgeEvent;

  private readonly _trigger: Rive.ViewModelInstanceTrigger;

  /**
   * Creates a new instance of the ModelTrigger class.
   *
   * @param trigger - The Rive trigger instance to encapsulate.
   */
  constructor(trigger: Rive.ViewModelInstanceTrigger) {
    this._trigger = trigger;

    this.onRaised = new ForgeEvent(`${trigger.name}Changed`);

    this._trigger.on(() => {
      this.onRaised.raise();
    });
  }
}
