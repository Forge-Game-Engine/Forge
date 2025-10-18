import { Resettable, Updatable } from 'forge/common';
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
  private readonly _triggerActions: Set<TriggerAction>;
  private readonly _axis1dActions: Set<Axis1dAction>;
  private readonly _axis2dActions: Set<Axis2dAction>;
  private readonly _holdActions: Set<HoldAction>;

  /** Constructs a new InputManager. */
  constructor() {
    this._activeGroup = null;

    this._updatables = new Set();
    this._resettables = new Set();
    this._triggerActions = new Set();
    this._axis1dActions = new Set();
    this._axis2dActions = new Set();
    this._holdActions = new Set();
  }

  /** Adds new actions to the manager.
   * @param action - The action(s) to add.
   */
  public addTriggerActions(...actions: TriggerAction[]): void {
    for (const action of actions) {
      this._triggerActions.add(action);
      this.addResettable(action);
    }
  }

  /**
   * Adds a new 1D axis action to the manager and marks it as resettable.
   * @param action - The action to add.
   */
  public addAxis1dActions(...actions: Axis1dAction[]): void {
    for (const action of actions) {
      this._axis1dActions.add(action);
      this.addResettable(action);
    }
  }

  /**
   * Adds a new 2D axis action to the manager and marks it as resettable.
   * @param action - The action to add.
   */
  public addAxis2dActions(...actions: Axis2dAction[]): void {
    for (const action of actions) {
      this._axis2dActions.add(action);
      this.addResettable(action);
    }
  }

  /**
   * Adds a new hold action to the manager.
   * @param action - The action to add.
   */
  public addHoldActions(...actions: HoldAction[]): void {
    for (const action of actions) {
      this._holdActions.add(action);
    }
  }

  /** Removes a trigger action from the manager and unmarks it as resettable.
   * @param action - The action to remove.
   */
  public removeTriggerAction(action: TriggerAction): void {
    this._triggerActions.delete(action);
    this.removeResettable(action);
  }

  /** Removes a 1D axis action from the manager and unmarks it as resettable.
   * @param action - The action to remove.
   */
  public removeAxis1dAction(action: Axis1dAction): void {
    this._axis1dActions.delete(action);
    this.removeResettable(action);
  }

  /** Removes a 2D axis action from the manager and unmarks it as resettable.
   * @param action - The action to remove.
   */
  public removeAxis2dAction(action: Axis2dAction): void {
    this._axis2dActions.delete(action);
    this.removeResettable(action);
  }

  /** Removes a hold action from the manager.
   * @param action - The action to remove.
   */
  public removeHoldAction(action: HoldAction): void {
    this._holdActions.delete(action);
  }

  /** Gets a trigger action by name.
   * @param name - The name of the action to get.
   * @returns The TriggerAction with the specified name.
   * @throws Error if no action with the specified name is found.
   */
  public getTriggerAction(name: string): TriggerAction {
    for (const action of this._triggerActions) {
      if (action.name === name) {
        return action;
      }
    }

    throw new Error(`No TriggerAction found with name: ${name}`);
  }

  /** Gets a 1D axis action by name.
   * @param name - The name of the action to get.
   * @returns The Axis1dAction with the specified name.
   * @throws Error if no action with the specified name is found.
   */
  public getAxis1dAction(name: string): Axis1dAction {
    for (const action of this._axis1dActions) {
      if (action.name === name) {
        return action;
      }
    }

    throw new Error(`No Axis1dAction found with name: ${name}`);
  }

  /** Gets a 2D axis action by name.
   * @param name - The name of the action to get.
   * @returns The Axis2dAction with the specified name.
   * @throws Error if no action with the specified name is found.
   */
  public getAxis2dAction(name: string): Axis2dAction {
    for (const action of this._axis2dActions) {
      if (action.name === name) {
        return action;
      }
    }

    throw new Error(`No Axis2dAction found with name: ${name}`);
  }

  /** Gets a hold action by name.
   * @param name - The name of the action to get.
   * @returns The HoldAction with the specified name.
   * @throws Error if no action with the specified name is found.
   */
  public getHoldAction(name: string): HoldAction {
    for (const action of this._holdActions) {
      if (action.name === name) {
        return action;
      }
    }

    throw new Error(`No HoldAction found with name: ${name}`);
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
  public dispatchTriggerAction(binding: InputBinding<TriggerAction>): void {
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
  ): void {
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
  ): void {
    if (binding.action.inputGroup === this._activeGroup) {
      binding.action.set(x, y);
    }
  }

  /**
   * Dispatches the start of a hold action if its input group is active.
   * @param binding - The input binding containing the action to start.
   */
  public dispatchHoldStartAction(binding: InputBinding<HoldAction>): void {
    if (binding.action.inputGroup === this._activeGroup) {
      binding.action.startHold();
    }
  }

  /**
   * Dispatches the end of a hold action.
   * @param binding - The input binding containing the action to end.
   */
  public dispatchHoldEndAction(binding: InputBinding<HoldAction>): void {
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
