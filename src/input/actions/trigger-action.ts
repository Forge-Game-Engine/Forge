import { InputInteraction } from '../interactions/input-interaction';
import { InputGroup } from '../input-group';
import { InputAction } from './input-action';
import { InputManager } from '../input-manager';
import { ForgeEvent } from '../../events';
import { Resettable } from '../../common';

export class TriggerAction implements InputAction, Resettable {
  public readonly name: string;

  public interactions: Map<InputGroup, Set<InputInteraction>>;
  public readonly triggerEvent: ForgeEvent;

  private _triggered: boolean = false;

  constructor(name: string, inputManager: InputManager) {
    this.name = name;

    this.interactions = new Map();

    inputManager.registerTriggerAction(this);

    this.triggerEvent = new ForgeEvent('Trigger Event');
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

  public bind<TArgs>(
    interaction: InputInteraction<TArgs>,
    group: InputGroup,
  ): void {
    const existingInteraction = this._findInteractionById(
      interaction.id,
      group,
    );

    if (existingInteraction) {
      console.warn(
        `Binding with interaction "${interaction.id}" already exists in group "${group.name}". Not adding again.`,
      );

      return;
    }

    const groupInteractions =
      this.interactions.get(group) ?? new Set<InputInteraction>();

    groupInteractions.add(interaction);
    this.interactions.set(group, groupInteractions);
    group.triggerActions.add(this);
  }

  private _findInteractionById(id: string, group: InputGroup) {
    const groupInteractions = this.interactions.get(group);

    if (!groupInteractions) {
      return null;
    }

    for (const interaction of groupInteractions) {
      if (interaction.id === id) {
        return interaction;
      }
    }
  }
}
