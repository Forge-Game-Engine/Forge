import { InputInteraction } from '../interactions';
import { ActionResetType, actionResetTypes } from '../constants';
import { InputGroup } from '../input-group';
import { InputAction } from './input-action';

export class Axis1dAction implements InputAction {
  public readonly name: string;

  public interactions: Map<InputGroup, Set<InputInteraction>>;

  private _value: number = 0;
  private readonly _actionResetType: ActionResetType;

  constructor(name: string, actionResetType: ActionResetType = 'zero') {
    this.name = name;
    this.interactions = new Map<InputGroup, Set<InputInteraction>>();
    this._actionResetType = actionResetType;
  }

  public reset() {
    this._value =
      this._actionResetType === actionResetTypes.zero ? 0 : this._value;
  }

  get value(): number {
    return this._value;
  }

  public set(value: number) {
    this._value = value;
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
    group.axis1dActions.add(this);
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
