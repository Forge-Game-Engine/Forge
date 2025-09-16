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

  /** Constructs a new InputManager. */
  constructor() {
    this._activeGroup = null;

    this._updatables = new Set();
    this._resettables = new Set();
  }

  /** Sets the active input group.
   * @param group - The name of the group to set as active, or null to clear.
   */
  public setActiveGroup(group: string | null): void {
    this._activeGroup = group;
  }

  /** Gets the currently active input group, or null if none is active. */
  get activeGroup(): string | null {
    return this._activeGroup;
  }

  /**
   * Dispatches a trigger action if its input group is active.
   * @param binding - The input binding containing the action to trigger.
   */
  public dispatchTriggerAction(binding: InputBinding<TriggerAction>) {
    if (binding.action.inputGroup === this._activeGroup) {
      binding.action.trigger();
    }
  }

  /**
   * Dispatches a 1D axis action if its input group is active.
   * @param binding - The input binding containing the action to set.
   * @param value - The value to set for the axis action.
   */
  public dispatchAxis1dAction(
    binding: InputBinding<Axis1dAction>,
    value: number,
  ) {
    if (binding.action.inputGroup === this._activeGroup) {
      binding.action.set(value);
    }
  }

  /**
   * Dispatches a 2D axis action if its input group is active.
   * @param binding - The input binding containing the action to set.
   * @param x - The x value to set for the axis action.
   * @param y - The y value to set for the axis action.
   */
  public dispatchAxis2dAction(
    binding: InputBinding<Axis2dAction>,
    x: number,
    y: number,
  ) {
    if (binding.action.inputGroup === this._activeGroup) {
      binding.action.set(x, y);
    }
  }

  /**
   * Dispatches the start of a hold action if its input group is active.
   * @param binding - The input binding containing the action to start.
   */
  public dispatchHoldStartAction(binding: InputBinding<HoldAction>) {
    if (binding.action.inputGroup === this._activeGroup) {
      binding.action.startHold();
    }
  }

  /**
   * Dispatches the end of a hold action.
   * @param binding - The input binding containing the action to end.
   */
  public dispatchHoldEndAction(binding: InputBinding<HoldAction>) {
    // We end the hold regardless of the active group, as the hold may have started
    binding.action.endHold();
  }

  /** Adds one or more updatable sources to the manager.
   * @param updatables - The updatable sources to add.
   */
  public addUpdatable(...updatables: Updatable[]): void {
    for (const updatable of updatables) {
      this._updatables.add(updatable);
    }
  }

  /** Removes an updatable source from the manager.
   * @param source - The updatable source to remove.
   */
  public removeUpdatable(source: Updatable): void {
    this._updatables.delete(source);
  }

  /** Adds one or more resettable sources to the manager.
   * @param resettables - The resettable sources to add.
   */
  public addResettable(...resettables: Resettable[]): void {
    for (const resettable of resettables) {
      this._resettables.add(resettable);
    }
  }

  /** Removes a resettable source from the manager.
   * @param resettable - The resettable source to remove.
   */
  public removeResettable(resettable: Resettable): void {
    this._resettables.delete(resettable);
  }

  /** Updates all updatable sources.
   * @param deltaTime - The time elapsed since the last update, in milliseconds.
   */
  public update(deltaTime: number): void {
    for (const updatable of this._updatables) {
      updatable.update(deltaTime);
    }
  }

  /** Resets all resettable sources. */
  public reset(): void {
    for (const resettable of this._resettables) {
      resettable.reset();
    }
  }
}
