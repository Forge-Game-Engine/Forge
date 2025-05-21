import { Entity, filterEntitiesByComponents } from './entity';
import { expect, test } from 'vitest';
import { Component } from './types';

class MockComponent implements Component {
  public name: symbol;

  constructor() {
    this.name = MockComponent.symbol;
  }

  public static readonly symbol = Symbol('mock-component');
}

test('creating an entity', () => {
  const entity = new Entity('player', []);

  expect(entity).not.toBe(null);
  expect(entity.name).toBe('player');
});

test('adding a component', () => {
  const entity = new Entity('player', []);
  const component = new MockComponent();

  entity.addComponent(component);

  expect(entity.getComponent(MockComponent.symbol)).not.toBeNull();
});

test('removing a component', () => {
  const component = new MockComponent();
  const entity = new Entity('player', [component]);

  entity.removeComponent(MockComponent.symbol);

  expect(entity.getComponent(MockComponent.symbol)).toBeNull();
});

test('filtering by component', () => {
  const component = new MockComponent();

  const entity1 = new Entity('player1', [component]);
  const entity2 = new Entity('player2', []);
  const entity3 = new Entity('player3', [component]);

  const selectedEntities = filterEntitiesByComponents(
    new Set([entity1, entity2, entity3]),
    [MockComponent.symbol],
  );

  expect(selectedEntities).toHaveLength(2);
});
