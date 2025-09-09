import { InputInteraction } from '../interactions';
import { InputGroup } from '../input-group';
import { InputAction } from './input-action';
import { InputManager } from '../input-manager';

export class HoldAction implements InputAction {
  public readonly name: string;

  public interactions: Map<InputGroup, Set<InputInteraction>>;

  private _held: boolean = false;

  constructor(name: string, inputManager: InputManager) {
    this.name = name;
    this.interactions = new Map();
    inputManager.registerHoldAction(this);
  }

  public startHold() {
    this._held = true;
  }

  public reset() {
    this._held = false;
  }

  get isHeld(): boolean {
    return this._held;
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
    group.holdActions.add(this);
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
