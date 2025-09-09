import { Vector2 } from '../../math';
import { InputInteraction } from '../interactions';
import { ActionResetType, actionResetTypes } from '../constants';
import { InputGroup } from '../input-group';
import { InputAction } from './input-action';
import { InputManager } from '../input-manager';

export class Axis2dAction implements InputAction {
  public readonly name: string;

  public interactions: Map<InputGroup, Set<InputInteraction>>;

  private _value: Vector2 = Vector2.zero;
  private readonly _actionResetType: ActionResetType;

  constructor(
    name: string,
    inputManager: InputManager,
    actionResetType: ActionResetType = 'zero',
  ) {
    this.name = name;
    this.interactions = new Map();
    this._actionResetType = actionResetType;
    inputManager.registerAxis2dAction(this);
  }

  public reset() {
    if (this._actionResetType === actionResetTypes.zero) {
      this._value.x = 0;
      this._value.y = 0;
    }
  }

  get value(): Vector2 {
    return this._value;
  }

  public set(value: Vector2) {
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
    group.axis2dActions.add(this);
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
