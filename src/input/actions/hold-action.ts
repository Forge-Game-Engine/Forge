import { InputInteraction } from '../interactions';
import { InputGroup } from '../input-group';
import { InputAction } from './input-action';

export class HoldAction implements InputAction {
  public readonly name: string;
  public interactions: Map<InputGroup, Set<InputInteraction>>;
  private _held: boolean = false;

  constructor(name: string) {
    this.name = name;
    this.interactions = new Map();
  }

  public hold() {
    this._held = true;
  }

  public release() {
    this._held = false;
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
    const groupInteractions =
      this.interactions.get(group) ?? new Set<InputInteraction>();
    groupInteractions.add(interaction);
    this.interactions.set(group, groupInteractions);
    group.holdActions.add(this);
  }
}