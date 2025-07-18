import { Resettable } from '../common';
import { InputAction, TriggerAction } from './actions';
import { InputBinding } from './input-binding';
import { InputGroup } from './input-group';
import { InputSource } from './input-sources';

/**
 * InputManager is responsible for managing input sources, groups, and actions.
 * It is the top-level class that coordinates input handling.
 */
export class InputManager implements Resettable {
  private readonly _sources: Set<InputSource>;
  private readonly _actions: Set<InputAction>;

  private _activeGroup: InputGroup | null;
  private _triggerActionPendingBind: TriggerAction | null = null;

  constructor() {
    this._sources = new Set<InputSource>();
    this._actions = new Set<InputAction>();
    this._activeGroup = null;
  }

  public addSource(source: InputSource): void {
    this._sources.add(source);
  }

  public removeSource(source: InputSource): boolean {
    return this._sources.delete(source);
  }

  public addAction(action: InputAction): void {
    this._actions.add(action);
  }

  public removeAction(action: InputAction): boolean {
    return this._actions.delete(action);
  }

  public setActiveGroup(group: InputGroup | null): void {
    this._activeGroup = group;
  }

  get activeGroup(): InputGroup | null {
    return this._activeGroup;
  }

  public dispatchTriggerAction(binding: InputBinding): void {
    if (!this._activeGroup) {
      return;
    }

    if (this._triggerActionPendingBind) {
      this._triggerActionPendingBind.bind(binding, this._activeGroup);
      this._triggerActionPendingBind = null;
    }

    this._activeGroup.dispatchTriggerAction(binding);
  }

  public bindOnNextTriggerAction(action: TriggerAction) {
    if (!this._activeGroup) {
      throw new Error('No active input group set.');
    }

    this._triggerActionPendingBind = action;
  }

  public getAction<TAction extends InputAction>(name: string) {
    for (const action of this._actions) {
      if (action.name === name) {
        return action as TAction;
      }
    }

    throw new Error(`Action with name "${name}" not found.`);
  }

  public reset(): void {
    this._resetAll(this._actions);
    this._resetAll(this._sources);
  }

  private _resetAll(resettables: Map<string, Resettable>): void;
  private _resetAll(resettables: Iterable<Resettable>): void;
  private _resetAll(
    resettables: Map<string, Resettable> | Iterable<Resettable>,
  ): void {
    if (resettables instanceof Map) {
      for (const resettable of resettables.values()) {
        resettable.reset();
      }

      return;
    }

    for (const resettable of resettables) {
      resettable.reset();
    }
  }
}
