import { beforeEach, describe, expect, it } from 'vitest';
import { Axis1dAction } from './axis-1d-action';
import { MouseAxis1dInteraction } from '../interactions';
import { MouseInputSource } from '../input-sources';
import { InputManager } from '../input-manager';
import { Game } from '../../ecs';
import { InputGroup } from '../input-group';

describe('InputAxis1d', () => {
  let action: Axis1dAction;
  let manager: InputManager;
  let game: Game;
  let source: MouseInputSource;
  let group: InputGroup;

  beforeEach(() => {
    manager = new InputManager();
    action = new Axis1dAction('zoom', manager);
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
    const interaction = new MouseAxis1dInteraction(source);

    action.bind(interaction, group);

    const interactions = action.interactions.get(group)?.values().toArray();

    expect(interactions?.length).toBe(1);
    expect(interactions?.[0]?.id).toBe(interaction.id);
  });
});
