import { Resettable, Updatable } from '../common';
import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  TriggerAction,
} from './actions';
import { InputBinding } from './input-binding';

/**
 * InputManager is responsible for managing input sources, groups, and actions.
 * It is the top-level class that coordinates input handling.
 */
export class InputManager implements Updatable {
  private _activeGroup: string | null;

  private readonly _updatables: Set<Updatable>;
  private readonly _resettables: Set<Resettable>;

  constructor() {
    this._activeGroup = null;

    this._updatables = new Set();
    this._resettables = new Set();
  }

  public setActiveGroup(group: string | null): void {
    this._activeGroup = group;
  }

  get activeGroup(): string | null {
    return this._activeGroup;
  }

  public dispatchTriggerAction(binding: InputBinding<TriggerAction>) {
    if (binding.action.inputGroup === this._activeGroup) {
      binding.action.trigger();
    }
  }

  public dispatchAxis1dAction(
    binding: InputBinding<Axis1dAction>,
    value: number,
  ) {
    if (binding.action.inputGroup === this._activeGroup) {
      binding.action.set(value);
    }
  }

  public dispatchAxis2dAction(
    binding: InputBinding<Axis2dAction>,
    x: number,
    y: number,
  ) {
    if (binding.action.inputGroup === this._activeGroup) {
      binding.action.set(x, y);
    }
  }

  public dispatchHoldStartAction(binding: InputBinding<HoldAction>) {
    if (binding.action.inputGroup === this._activeGroup) {
      binding.action.startHold();
    }
  }

  public dispatchHoldEndAction(binding: InputBinding<HoldAction>) {
    // We end the hold regardless of the active group, as the hold may have started
    binding.action.endHold();
  }

  public addUpdatable(...updatables: Updatable[]): void {
    for (const updatable of updatables) {
      this._updatables.add(updatable);
    }
  }

  public removeUpdatable(source: Updatable): void {
    this._updatables.delete(source);
  }

  public addResettable(...resettables: Resettable[]): void {
    for (const resettable of resettables) {
      this._resettables.add(resettable);
    }
  }

  public removeResettable(resettable: Resettable): void {
    this._resettables.delete(resettable);
  }

  public update(deltaTime: number): void {
    for (const updatable of this._updatables) {
      updatable.update(deltaTime);
    }
  }

  public reset(): void {
    for (const resettable of this._resettables) {
      resettable.reset();
    }
  }
}
