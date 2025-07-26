import { beforeEach, describe, expect, it } from 'vitest';
import { Axis2dAction } from './axis-2d-action';
import { MouseAxis2dInteraction } from '../interactions';
import { ActionableInputSource, MouseInputSource } from '../input-sources';
import { InputManager } from '../input-manager';
import { Game } from '../../ecs';
import { InputGroup } from '../input-group';
import { Vector2 } from '../../math';

describe('InputAxis2d', () => {
  let action: Axis2dAction;
  let manager: InputManager;
  let game: Game;
  let source: ActionableInputSource;
  let group: InputGroup;

  beforeEach(() => {
    action = new Axis2dAction('pan');
    manager = new InputManager();
    game = new Game();
    source = new MouseInputSource(manager, game);
    group = new InputGroup('test');
  });

  it('should initialize with the given name', () => {
    expect(action.name).toBe('pan');
  });

  it('should initialize value to 0', () => {
    expect(action.value.x).toBe(0);
    expect(action.value.y).toBe(0);
  });

  it('should set value correctly', () => {
    action.set(new Vector2(0.5, 0.5));
    expect(action.value.x).toBe(0.5);
    expect(action.value.y).toBe(0.5);

    action.set(new Vector2(-1, -1));
    expect(action.value.x).toBe(-1);
    expect(action.value.y).toBe(-1);
  });

  it('should reset value to 0', () => {
    action.set(new Vector2(1, 1));
    expect(action.value.x).toBe(1);
    expect(action.value.y).toBe(1);

    action.reset();
    expect(action.value.x).toBe(0);
    expect(action.value.y).toBe(0);
  });

  it('should bind sources correctly', () => {
    const interaction = new MouseAxis2dInteraction(source);

    action.bind(interaction, group);
    
    const interactions = Array.from(action.interactions.get(group)?.values() ?? []);

    expect(interactions?.length).toBe(1);
    expect(interactions?.[0]?.id).toBe(interaction.id);
  });
});
