import { beforeEach, describe, expect, it } from 'vitest';
import { InputManager } from './input-manager';
import { TriggerAction } from './actions';
import { InputSource } from './input-sources';
import { InputGroup } from './input-group';
import { InputInteraction } from './interactions/input-interaction';

function createMockInputSource(): InputSource {
  return { name: 'test-input-source' };
}

class TestTriggerActionInputInteraction extends InputInteraction<string> {
  constructor(args: string, source: InputSource) {
    super(args, source);
  }

  public override matchesArgs(args: unknown): boolean {
    return this.args === args;
  }
}

describe('InputManager', () => {
  let manager: InputManager;
  let inputGroup: InputGroup;
  let testInputSource: InputSource;
  let triggerInputInteraction: InputInteraction;
  let testAction: TriggerAction;

  beforeEach(() => {
    manager = new InputManager();
    inputGroup = new InputGroup('test-group');
    testInputSource = createMockInputSource();
    triggerInputInteraction = new TestTriggerActionInputInteraction(
      'test',
      testInputSource,
    );
    testAction = new TriggerAction('test-action', manager);
  });

  it('should set and get active group', () => {
    expect(manager.activeGroup).toBeNull();
    manager.setActiveGroup(inputGroup);
    expect(manager.activeGroup).toBe(inputGroup);
    manager.setActiveGroup(null);
    expect(manager.activeGroup).toBeNull();
  });

  it('should dispatch trigger action to active group', () => {
    testAction.bind(triggerInputInteraction, inputGroup);
    manager.setActiveGroup(inputGroup);

    expect(testAction.isTriggered).toBe(false);

    manager.dispatchTriggerAction(triggerInputInteraction);
    expect(testAction.isTriggered).toBe(true);
  });

  it('should not dispatch trigger action if no active group', () => {
    testAction.bind(triggerInputInteraction, inputGroup);

    expect(testAction.isTriggered).toBe(false);

    manager.dispatchTriggerAction(triggerInputInteraction);
    expect(testAction.isTriggered).toBe(false);
  });

  it('should bind trigger action on next dispatch', () => {
    manager.setActiveGroup(inputGroup);

    expect(testAction.isTriggered).toBe(false);

    manager.bindOnNextTriggerAction(testAction);

    manager.dispatchTriggerAction(triggerInputInteraction);
    expect(testAction.isTriggered).toBe(false);

    manager.dispatchTriggerAction(triggerInputInteraction);
    expect(testAction.isTriggered).toBe(true);
  });

  it('should throw when attempting to bind trigger action on next dispatch when no active group is set', () => {
    expect(testAction.isTriggered).toBe(false);

    expect(() => manager.bindOnNextTriggerAction(testAction)).toThrow(
      'No active input group set.',
    );
  });

  it('should stop pending trigger action binding', () => {
    manager.setActiveGroup(inputGroup);

    expect(testAction.isTriggered).toBe(false);

    manager.bindOnNextTriggerAction(testAction);

    manager.stopPendingTriggerActionBinding();

    manager.dispatchTriggerAction(triggerInputInteraction);
    expect(testAction.isTriggered).toBe(false);

    manager.dispatchTriggerAction(triggerInputInteraction);
    expect(testAction.isTriggered).toBe(false);
  });

  it('should get action by name', () => {
    const found = manager.getTriggerAction('test-action');
    expect(found).toBe(testAction);
  });

  it('should return null if action not found by name', () => {
    const found = manager.getTriggerAction('missing');
    expect(found).toBe(null);
  });
});
