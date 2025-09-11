import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  TriggerAction,
} from './actions';
import { InputGroup } from './input-group';
import { Resettable, Updatable } from '../common';
import { InputInteraction } from './interactions';

/**
 * InputManager is responsible for managing input sources, groups, and actions.
 * It is the top-level class that coordinates input handling.
 */
export class InputManager implements Updatable {
  private _activeGroup: InputGroup | null;
  private _triggerActionPendingBind: TriggerAction | null = null;
  private _holdActionPendingBind: HoldAction | null = null;
  private _axis1dActionPendingBind: Axis1dAction | null = null;
  private _axis2dActionPendingBind: Axis2dAction | null = null;

  private readonly _updatables: Set<Updatable>;
  private readonly _resettables: Set<Resettable>;

  private readonly _triggerActions: Map<string, TriggerAction>;
  private readonly _holdActions: Map<string, HoldAction>;
  private readonly _axis1dActions: Map<string, Axis1dAction>;
  private readonly _axis2dActions: Map<string, Axis2dAction>;

  constructor() {
    this._activeGroup = null;

    this._updatables = new Set();
    this._resettables = new Set();

    this._triggerActions = new Map();
    this._holdActions = new Map();
    this._axis1dActions = new Map();
    this._axis2dActions = new Map();
  }

  public registerTriggerAction(action: TriggerAction): void {
    const { name } = action;

    if (this._triggerActions.has(name)) {
      throw new Error(`TriggerAction with name ${name} is already registered.`);
    }

    this._triggerActions.set(name, action);
    this.addResettable(action);
  }

  public deregisterTriggerAction(name: string): void {
    this._triggerActions.delete(name);
  }

  public getTriggerAction(name: string) {
    return this._triggerActions.get(name) ?? null;
  }

  public registerHoldAction(action: HoldAction): void {
    const { name } = action;

    if (this._holdActions.has(name)) {
      throw new Error(`HoldAction with name ${name} is already registered.`);
    }

    this._holdActions.set(name, action);
  }

  public deregisterHoldAction(name: string): void {
    this._holdActions.delete(name);
  }

  public getHoldAction(name: string) {
    return this._holdActions.get(name) ?? null;
  }

  public registerAxis1dAction(action: Axis1dAction): void {
    const { name } = action;

    if (this._axis1dActions.has(name)) {
      throw new Error(`Axis1dAction with name ${name} is already registered.`);
    }

    this._axis1dActions.set(name, action);
    this.addResettable(action);
  }

  public deregisterAxis1dAction(name: string): void {
    this._axis1dActions.delete(name);
  }

  public getAxis1dAction(name: string) {
    return this._axis1dActions.get(name) ?? null;
  }

  public registerAxis2dAction(action: Axis2dAction): void {
    const { name } = action;

    if (this._axis2dActions.has(name)) {
      throw new Error(`Axis2dAction with name ${name} is already registered.`);
    }

    this._axis2dActions.set(name, action);
    this.addResettable(action);
  }

  public deregisterAxis2dAction(name: string): void {
    this._axis2dActions.delete(name);
  }

  public getAxis2dAction(name: string) {
    return this._axis2dActions.get(name) ?? null;
  }

  public setActiveGroup(group: InputGroup | null): void {
    this._activeGroup = group;
  }

  get activeGroup(): InputGroup | null {
    return this._activeGroup;
  }

  public dispatchTriggerAction(interaction: InputInteraction): void {
    if (!this._activeGroup) {
      return;
    }

    if (this._triggerActionPendingBind) {
      this._triggerActionPendingBind.bind(interaction, this._activeGroup);
      this.stopPendingTriggerActionBinding();

      return;
    }

    this._activeGroup.dispatchTriggerAction(interaction);
  }

  public dispatchHoldStartAction(interaction: InputInteraction): void {
    if (!this._activeGroup) {
      return;
    }

    if (this._holdActionPendingBind) {
      this._holdActionPendingBind.bind(interaction, this._activeGroup);
      this.stopPendingTriggerActionBinding();

      return;
    }

    this._activeGroup.dispatchHoldStartAction(interaction);
  }

  public dispatchHoldEndAction(interaction: InputInteraction): void {
    if (!this._activeGroup) {
      return;
    }

    if (this._holdActionPendingBind) {
      this._holdActionPendingBind.bind(interaction, this._activeGroup);
      this.stopPendingTriggerActionBinding();

      return;
    }

    this._activeGroup.dispatchHoldEndAction(interaction);
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

  public bindOnNextHoldAction(action: HoldAction) {
    if (!this._activeGroup) {
      throw new Error('No active input group set.');
    }

    this._holdActionPendingBind = action;
  }

  public stopPendingHoldActionBinding() {
    this._holdActionPendingBind = null;
  }

  public dispatchAxis1dAction(
    interaction: InputInteraction,
    value: number,
  ): void {
    if (!this._activeGroup) {
      return;
    }

    if (this._axis1dActionPendingBind) {
      this._axis1dActionPendingBind.bind(interaction, this._activeGroup);
      this.stopPendingAxis1dActionBinding();

      return;
    }

    this._activeGroup.dispatchAxis1dAction(interaction, value);
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

  public dispatchAxis2dAction(
    interaction: InputInteraction,
    x: number,
    y: number,
  ): void {
    if (!this._activeGroup) {
      return;
    }

    if (this._axis2dActionPendingBind) {
      this._axis2dActionPendingBind.bind(interaction, this._activeGroup);
      this.stopPendingAxis2dActionBinding();

      return;
    }

    this._activeGroup.dispatchAxis2dAction(interaction, x, y);
  }

  public bindOnNextAxis2dAction(action: Axis2dAction) {
    if (!this._activeGroup) {
      throw new Error('No active input group set.');
    }

    this._axis2dActionPendingBind = action;
  }

  public stopPendingAxis2dActionBinding() {
    this._axis2dActionPendingBind = null;
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
