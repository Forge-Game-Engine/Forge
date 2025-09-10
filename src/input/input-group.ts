import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  TriggerAction,
} from './actions';
import { InputInteraction } from './interactions';

/**
 * InputGroup represents a collection of interactions that can be activated or deactivated together.
 */
export class InputGroup {
  public readonly name: string;

  public readonly triggerActions: Set<TriggerAction>;
  public readonly axis1dActions: Set<Axis1dAction>;
  public readonly axis2dActions: Set<Axis2dAction>;
  public readonly holdActions: Set<HoldAction>;

  constructor(name: string) {
    this.name = name;

    this.triggerActions = new Set();
    this.axis1dActions = new Set();
    this.axis2dActions = new Set();
    this.holdActions = new Set();
  }

  public dispatchTriggerAction(interaction: InputInteraction): void {
    for (const action of this.triggerActions) {
      const interactionsForAction = action.interactions.get(this);

      if (!interactionsForAction) {
        continue;
      }

      for (const interactionForAction of interactionsForAction) {
        if (interactionForAction.matchesArgs(interaction.args)) {
          action.trigger();
        }
      }
    }
  }

  public dispatchHoldStartAction(interaction: InputInteraction): void {
    for (const action of this.holdActions) {
      const interactionsForAction = action.interactions.get(this);

      if (!interactionsForAction) {
        continue;
      }

      for (const interactionForAction of interactionsForAction) {
        if (interactionForAction.matchesArgs(interaction.args)) {
          action.startHold();
        }
      }
    }
  }

  public dispatchHoldEndAction(interaction: InputInteraction): void {
    for (const action of this.holdActions) {
      const interactionsForAction = action.interactions.get(this);

      if (!interactionsForAction) {
        continue;
      }

      for (const interactionForAction of interactionsForAction) {
        if (interactionForAction.matchesArgs(interaction.args)) {
          action.endHold();
        }
      }
    }
  }

  public dispatchAxis1dAction(
    interaction: InputInteraction,
    value: number,
  ): void {
    for (const action of this.axis1dActions) {
      const interactionsForAction = action.interactions.get(this);

      if (!interactionsForAction) {
        continue;
      }

      for (const interactionForAction of interactionsForAction) {
        if (interactionForAction.matchesArgs(interaction.args)) {
          action.set(value);
        }
      }
    }
  }

  public dispatchAxis2dAction(
    interaction: InputInteraction,
    x: number,
    y: number,
  ): void {
    for (const action of this.axis2dActions) {
      const interactionsForAction = action.interactions.get(this);

      if (!interactionsForAction) {
        continue;
      }

      for (const interactionForAction of interactionsForAction) {
        if (interactionForAction.matchesArgs(interaction.args)) {
          action.set(x, y);
        }
      }
    }
  }
}
