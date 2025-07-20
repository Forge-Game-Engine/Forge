import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputManager } from './input-manager';
import { TriggerAction } from './actions';
import { ActionableInputSource } from './input-sources';
import { InputGroup } from './input-group';
import { InputBinding } from './bindings/input-binding';

function createMockInputSource(): ActionableInputSource {
  return { name: 'test-input-source', reset: vi.fn(), stop: vi.fn() };
}

class TestTriggerActionInputBinding extends InputBinding<string> {
  constructor(args: string, source: ActionableInputSource) {
    super(args, source);
  }

  public override matchesArgs(args: unknown): boolean {
    return this.args === args;
  }
}

describe('InputManager', () => {
  let manager: InputManager;
  let inputGroup: InputGroup;
  let testInputSource: ActionableInputSource;
  let triggerInputBinding: InputBinding;
  let testAction: TriggerAction;

  beforeEach(() => {
    manager = new InputManager();
    inputGroup = new InputGroup('test-group');
    testInputSource = createMockInputSource();
    triggerInputBinding = new TestTriggerActionInputBinding(
      'test',
      testInputSource,
    );
    testAction = new TriggerAction('test-action');
  });

  it('should set and get active group', () => {
    expect(manager.activeGroup).toBeNull();
    manager.setActiveGroup(inputGroup);
    expect(manager.activeGroup).toBe(inputGroup);
    manager.setActiveGroup(null);
    expect(manager.activeGroup).toBeNull();
  });

  it('should dispatch trigger action to active group', () => {
    testAction.bind(triggerInputBinding, inputGroup);
    manager.addActions(testAction);
    manager.setActiveGroup(inputGroup);

    expect(testAction.isTriggered).toBe(false);

    manager.dispatchTriggerAction(triggerInputBinding);
    expect(testAction.isTriggered).toBe(true);

    manager.reset();
    expect(testAction.isTriggered).toBe(false);
  });

  it('should not dispatch trigger action if no active group', () => {
    testAction.bind(triggerInputBinding, inputGroup);
    manager.addActions(testAction);

    expect(testAction.isTriggered).toBe(false);

    manager.dispatchTriggerAction(triggerInputBinding);
    expect(testAction.isTriggered).toBe(false);
  });

  it('should bind trigger action on next dispatch', () => {
    manager.addActions(testAction);
    manager.setActiveGroup(inputGroup);

    expect(testAction.isTriggered).toBe(false);

    manager.bindOnNextTriggerAction(testAction);

    manager.dispatchTriggerAction(triggerInputBinding);
    expect(testAction.isTriggered).toBe(false);

    manager.dispatchTriggerAction(triggerInputBinding);
    expect(testAction.isTriggered).toBe(true);
  });

  it('should throw when attempting to bind trigger action on next dispatch when no active group is set', () => {
    manager.addActions(testAction);

    expect(testAction.isTriggered).toBe(false);

    expect(() => manager.bindOnNextTriggerAction(testAction)).toThrow(
      'No active input group set.',
    );
  });

  it('should stop pending trigger action binding', () => {
    manager.addActions(testAction);
    manager.setActiveGroup(inputGroup);

    expect(testAction.isTriggered).toBe(false);

    manager.bindOnNextTriggerAction(testAction);

    manager.stopPendingTriggerActionBinding();

    manager.dispatchTriggerAction(triggerInputBinding);
    expect(testAction.isTriggered).toBe(false);

    manager.dispatchTriggerAction(triggerInputBinding);
    expect(testAction.isTriggered).toBe(false);
  });

  it('should get action by name', () => {
    manager.addActions(testAction);
    const found = manager.getAction('test-action');
    expect(found).toBe(testAction);
  });

  it('should throw if action not found by name', () => {
    manager.addActions(testAction);
    const found = manager.getAction('missing');
    expect(found).toBe(null);
  });

  it('should reset all actions and sources', () => {
    const action1 = new TriggerAction('test-action1');
    const action2 = new TriggerAction('test-action2');
    const source1 = createMockInputSource();
    const source2 = createMockInputSource();

    action1.trigger();
    action2.trigger();
    expect(action1.isTriggered).toBe(true);
    expect(action2.isTriggered).toBe(true);

    manager.addActions(action1);
    manager.addActions(action2);
    manager.addSources(source1);
    manager.addSources(source2);

    manager.reset();

    expect(action1.isTriggered).toBe(false);
    expect(action2.isTriggered).toBe(false);
    expect(source1.reset).toHaveBeenCalled();
    expect(source2.reset).toHaveBeenCalled();
  });
});
