import { Resettable } from '../common';
import { Axis1dAction, InputAction, TriggerAction } from './actions';
import { InputBinding } from './bindings/input-binding';
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
  private _axis1dActionPendingBind: Axis1dAction | null = null;

  constructor() {
    this._sources = new Set<InputSource>();
    this._actions = new Set<InputAction>();
    this._activeGroup = null;
  }

  public addSources(...sources: InputSource[]): void {
    for (const source of sources) {
      this._sources.add(source);
    }
  }

  public removeSource(source: InputSource): boolean {
    return this._sources.delete(source);
  }

  public addActions(...actions: InputAction[]): void {
    for (const action of actions) {
      this._actions.add(action);
    }
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
      this.stopPendingTriggerActionBinding();

      return;
    }

    this._activeGroup.dispatchTriggerAction(binding);
  }

  public bindOnNextTriggerAction(action: TriggerAction) {
    if (!this._activeGroup) {
      throw new Error('No active input group set.');
    }

    this._triggerActionPendingBind = action;
  }

  public stopPendingTriggerActionBinding() {
    this._triggerActionPendingBind = null;
  }

  public dispatchAxis1dAction(binding: InputBinding, value: number): void {
    if (!this._activeGroup) {
      return;
    }

    if (this._axis1dActionPendingBind) {
      this._axis1dActionPendingBind.bind(binding, this._activeGroup);
      this.stopPendingAxis1dActionBinding();

      return;
    }

    this._activeGroup.dispatchAxis1dAction(binding, value);
  }

  public bindOnNextAxis1dAction(action: Axis1dAction) {
    if (!this._activeGroup) {
      throw new Error('No active input group set.');
    }

    this._axis1dActionPendingBind = action;
  }

  public stopPendingAxis1dActionBinding() {
    this._axis1dActionPendingBind = null;
  }

  public getAction<TAction extends InputAction>(name: string) {
    for (const action of this._actions) {
      if (action.name === name) {
        return action as TAction;
      }
    }

    return null;
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
