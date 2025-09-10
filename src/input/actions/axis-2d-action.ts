import { Vector2 } from '../../math';
import { InputInteraction } from '../interactions';
import { ActionResetType, actionResetTypes } from '../constants';
import { InputGroup } from '../input-group';
import { InputAction } from './input-action';
import { InputManager } from '../input-manager';
import { ParameterizedForgeEvent } from '../../events';
import { Resettable } from '../../common';

export class Axis2dAction implements InputAction, Resettable {
  public readonly name: string;

  public interactions: Map<InputGroup, Set<InputInteraction>>;
  public readonly valueChangeEvent: ParameterizedForgeEvent<Vector2>;

  private readonly _value: Vector2 = Vector2.zero;
  private readonly _actionResetType: ActionResetType;

  constructor(
    name: string,
    inputManager: InputManager,
    actionResetType: ActionResetType = actionResetTypes.zero,
  ) {
    this.name = name;

    this.interactions = new Map();
    this._actionResetType = actionResetType;

    inputManager.registerAxis2dAction(this);

    this.valueChangeEvent = new ParameterizedForgeEvent(
      'Axis2d Value Change Event',
    );
  }

  public reset() {
    if (this._actionResetType === actionResetTypes.zero) {
      this.set(0, 0);
    }
  }

  get value(): Vector2 {
    return this._value;
  }

  public set(x: number, y: number) {
    if (this._value.x === x && this._value.y === y) {
      return;
    }

    this._value.x = x;
    this._value.y = y;

    this.valueChangeEvent.raise(this._value);
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
