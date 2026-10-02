import { Resettable, Updatable } from '../common/index.js';
import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  TriggerAction,
} from './actions/index.js';
import { actionResetTypes } from './constants/index.js';
import { InputBinding } from './input-binding.js';

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

  // What each inactive group's actions would currently read if their group
  // were active: the value an axis had when its group was deactivated, or
  // the latest value a source dispatched to it since, and the holds whose
  // button is still down. Sources only dispatch on a change (a key press, a
  // stick moving), so without this an input that is already held when its
  // group becomes active would go unnoticed until it changes again.
  private readonly _suspendedAxis1dValues: Map<Axis1dAction, number>;
  private readonly _suspendedAxis2dValues: Map<
    Axis2dAction,
    { x: number; y: number }
  >;
  private readonly _suspendedHolds: Set<HoldAction>;

  /** Constructs a new InputManager. */
  constructor(activeGroup: string = 'game') {
    this._activeGroup = activeGroup;

    this._updatables = new Set();
    this._resettables = new Set();
    this._triggerActions = new Set();
    this._axis1dActions = new Set();
    this._axis2dActions = new Set();
    this._holdActions = new Set();

    this._suspendedAxis1dValues = new Map();
    this._suspendedAxis2dValues = new Map();
    this._suspendedHolds = new Set();
  }

  /** Adds new actions to the manager.
   * @param actions - The action(s) to add.
   */
  public addTriggerActions(...actions: TriggerAction[]): void {
    for (const action of actions) {
      this._triggerActions.add(action);
      this.addResettable(action);
    }
  }

  /**
   * Adds a new 1D axis action to the manager and marks it as resettable.
   * @param actions - The action(s) to add.
   */
  public addAxis1dActions(...actions: Axis1dAction[]): void {
    for (const action of actions) {
      this._axis1dActions.add(action);
      this.addResettable(action);
    }
  }

  /**
   * Adds a new 2D axis action to the manager and marks it as resettable.
   * @param actions - The action(s) to add.
   */
  public addAxis2dActions(...actions: Axis2dAction[]): void {
    for (const action of actions) {
      this._axis2dActions.add(action);
      this.addResettable(action);
    }
  }

  /**
   * Adds a new hold action to the manager.
   * @param actions - The action(s) to add.
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
    this._suspendedAxis1dValues.delete(action);
    this.removeResettable(action);
  }

  /** Removes a 2D axis action from the manager and unmarks it as resettable.
   * @param action - The action to remove.
   */
  public removeAxis2dAction(action: Axis2dAction): void {
    this._axis2dActions.delete(action);
    this._suspendedAxis2dValues.delete(action);
    this.removeResettable(action);
  }

  /** Removes a hold action from the manager.
   * @param action - The action to remove.
   */
  public removeHoldAction(action: HoldAction): void {
    this._holdActions.delete(action);
    this._suspendedHolds.delete(action);
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

  /**
   * Sets the active input group.
   *
   * The actions of the group being deactivated are released: its axes are
   * set to `0` and its held holds end. The actions of the group being
   * activated pick up the input that is currently held for them: each
   * `actionResetTypes.noReset` axis is set to the latest value dispatched to
   * it while its group was inactive (or the value it had when its group was
   * last deactivated), and each hold whose button is still down starts.
   * Trigger actions, and axes that reset to zero every frame, dispatched
   * while their group was inactive are discarded.
   *
   * Only actions added to this manager are released on deactivation.
   * @param group - The name of the group to set as active, or null to clear.
   */
  public setActiveGroup(group: string | null): void {
    if (group === this._activeGroup) {
      return;
    }

    const previousGroup = this._activeGroup;

    this._activeGroup = group;

    if (previousGroup !== null) {
      this._suspendGroup(previousGroup);
    }

    if (group !== null) {
      this._resumeGroup(group);
    }
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
   * Dispatches a 1D axis action if its input group is active. Otherwise, an
   * `actionResetTypes.noReset` action keeps the value to apply once its group
   * becomes active.
   * @param binding - The input binding containing the action to set.
   * @param value - The value to set for the axis action.
   */
  public dispatchAxis1dAction(
    binding: InputBinding<Axis1dAction>,
    value: number,
  ): void {
    const { action } = binding;

    if (action.inputGroup === this._activeGroup) {
      action.set(value);

      return;
    }

    if (action.actionResetType === actionResetTypes.noReset) {
      this._suspendedAxis1dValues.set(action, value);
    }
  }

  /**
   * Dispatches a 2D axis action if its input group is active. Otherwise, an
   * `actionResetTypes.noReset` action keeps the value to apply once its group
   * becomes active.
   * @param binding - The input binding containing the action to set.
   * @param x - The x value to set for the axis action.
   * @param y - The y value to set for the axis action.
   */
  public dispatchAxis2dAction(
    binding: InputBinding<Axis2dAction>,
    x: number,
    y: number,
  ): void {
    const { action } = binding;

    if (action.inputGroup === this._activeGroup) {
      action.set(x, y);

      return;
    }

    if (action.actionResetType === actionResetTypes.noReset) {
      this._suspendedAxis2dValues.set(action, { x, y });
    }
  }

  /**
   * Dispatches the start of a hold action if its input group is active.
   * Otherwise, the hold starts once its group becomes active, unless it ends
   * first.
   * @param binding - The input binding containing the action to start.
   */
  public dispatchHoldStartAction(binding: InputBinding<HoldAction>): void {
    const { action } = binding;

    if (action.inputGroup === this._activeGroup) {
      action.startHold();

      return;
    }

    this._suspendedHolds.add(action);
  }

  /**
   * Dispatches the end of a hold action, regardless of the active group, so
   * a hold that started while its group was active can't get stuck.
   * @param binding - The input binding containing the action to end.
   */
  public dispatchHoldEndAction(binding: InputBinding<HoldAction>): void {
    const { action } = binding;

    this._suspendedHolds.delete(action);

    if (action.isHeld) {
      action.endHold();
    }
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

  /**
   * Releases a group's actions as it is deactivated, keeping each one's
   * state to restore once the group is active again.
   */
  private _suspendGroup(group: string): void {
    for (const action of this._axis1dActions) {
      if (action.inputGroup !== group) {
        continue;
      }

      if (action.actionResetType === actionResetTypes.noReset) {
        this._suspendedAxis1dValues.set(action, action.value);
      }

      action.set(0);
    }

    for (const action of this._axis2dActions) {
      if (action.inputGroup !== group) {
        continue;
      }

      if (action.actionResetType === actionResetTypes.noReset) {
        this._suspendedAxis2dValues.set(action, {
          x: action.value.x,
          y: action.value.y,
        });
      }

      action.set(0, 0);
    }

    for (const action of this._holdActions) {
      if (action.inputGroup !== group || !action.isHeld) {
        continue;
      }

      this._suspendedHolds.add(action);
      action.endHold();
    }
  }

  /** Restores the state a group's actions were given while it was inactive. */
  private _resumeGroup(group: string): void {
    for (const [action, value] of this._suspendedAxis1dValues) {
      if (action.inputGroup === group) {
        this._suspendedAxis1dValues.delete(action);
        action.set(value);
      }
    }

    for (const [action, { x, y }] of this._suspendedAxis2dValues) {
      if (action.inputGroup === group) {
        this._suspendedAxis2dValues.delete(action);
        action.set(x, y);
      }
    }

    for (const action of this._suspendedHolds) {
      if (action.inputGroup !== group) {
        continue;
      }

      this._suspendedHolds.delete(action);

      if (!action.isHeld) {
        action.startHold();
      }
    }
  }
}
