import { Entity } from './entity';
import { expect, test } from 'vitest';
import { Component } from './types';
import { World } from './world';

class MockComponent implements Component {
  public name: symbol;

  constructor() {
    this.name = MockComponent.symbol;
  }

  public static readonly symbol = Symbol('mock-component');
}

const world = new World();

test('creating an entity', () => {
  const entity = new Entity('player', world, []);

  expect(entity).not.toBe(null);
  expect(entity.name).toBe('player');
});

test('adding a component', () => {
  const entity = new Entity('player', world, []);
  const component = new MockComponent();

  entity.addComponent(component);

  expect(entity.getComponent(MockComponent.symbol)).not.toBeNull();
});

test('removing a component', () => {
  const component = new MockComponent();
  const entity = new Entity('player', world, [component]);

  entity.removeComponent(MockComponent.symbol);

  expect(entity.getComponent(MockComponent.symbol)).toBeNull();
});
