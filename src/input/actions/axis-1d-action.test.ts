import { beforeEach, describe, expect, it } from 'vitest';
import { Axis1dAction } from './axis-1d-action';
import { MouseAxis1dBinding } from '../bindings';
import { ActionableInputSource, MouseInputSource } from '../input-sources';
import { InputManager } from '../input-manager';
import { Game } from '../../ecs';
import { InputGroup } from '../input-group';

describe('InputAxis1d', () => {
  let action: Axis1dAction;
  let manager: InputManager;
  let game: Game;
  let source: ActionableInputSource;
  let group: InputGroup;

  beforeEach(() => {
    action = new Axis1dAction('zoom');
    manager = new InputManager();
    game = new Game();
    source = new MouseInputSource(manager, game);
    group = new InputGroup('test');
  });

  it('should initialize with the given name', () => {
    expect(action.name).toBe('zoom');
  });

  it('should initialize value to 0', () => {
    expect(action.value).toBe(0);
  });

  it('should set value correctly', () => {
    action.set(0.5);
    expect(action.value).toBe(0.5);

    action.set(-1);
    expect(action.value).toBe(-1);
  });

  it('should reset value to 0', () => {
    action.set(1);
    expect(action.value).toBe(1);

    action.reset();
    expect(action.value).toBe(0);
  });

  it('should bind sources correctly', () => {
    const binding = new MouseAxis1dBinding(source);

    action.bind(binding, group);

    const bindings = action.bindings.get(group)?.values().toArray();

    expect(bindings?.length).toBe(1);
    expect(bindings?.[0]?.id).toBe(binding.id);
  });
});
