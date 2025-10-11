import { Entity } from './entity';
import { expect, test } from 'vitest';
import { Component } from './types';
import { World } from './world';

class MockComponent implements Component {
  public name: symbol;

  public static readonly symbol = Symbol('mock-component');

  constructor() {
    this.name = MockComponent.symbol;
  }
}

const world = new World('test-world');

test('creating an entity', () => {
  const entity = new Entity('player', world, []);

  expect(entity).not.toBe(null);
  expect(entity.name).toBe('player');
});

test('adding a component', () => {
  const entity = new Entity('player', world, []);
  const component = new MockComponent();

  entity.addComponents(component);

  expect(entity.getComponent(MockComponent.symbol)).not.toBeNull();
});

test('removing a component', () => {
  const component = new MockComponent();
  const entity = new Entity('player', world, [component]);

  entity.removeComponents(MockComponent.symbol);

  expect(entity.getComponent(MockComponent.symbol)).toBeNull();
});

test("parentTo sets the parent and adds to parent's children", () => {
  const parent = new Entity('parent', world, []);
  const child = new Entity('child', world, []);

  child.parentTo(parent);

  expect(child.parent).toBe(parent);
  expect(parent.children.has(child)).toBe(true);
});

test("parentTo removes child from previous parent's children", () => {
  const parent1 = new Entity('parent1', world, []);
  const parent2 = new Entity('parent2', world, []);
  const child = new Entity('child', world, []);

  child.parentTo(parent1);
  expect(parent1.children.has(child)).toBe(true);

  child.parentTo(parent2);
  expect(child.parent).toBe(parent2);
  expect(parent2.children.has(child)).toBe(true);
  expect(parent1.children.has(child)).toBe(false);
});

test('removeParent removes the parent', () => {
  const parent1 = new Entity('parent1', world, []);
  const child = new Entity('child', world, []);

  child.parentTo(parent1);
  expect(parent1.children.has(child)).toBe(true);

  child.removeParent();
  expect(child.parent).toBe(null);
  expect(parent1.children.has(child)).toBe(false);
});

test('containsAllComponents returns true when all components are present', () => {
  const componentA = new MockComponent();
  const componentB = new MockComponent();
  componentB.name = Symbol('mock-component-b');
  const entity = new Entity('player', world, [componentA, componentB]);

  const query: symbol[] = [componentA.name, componentB.name];
  expect(entity.containsAllComponents(query)).toBe(true);
});

test('containsAllComponents returns false when a component is missing', () => {
  const componentA = new MockComponent();
  const entity = new Entity('player', world, [componentA]);

  const missingSymbol = Symbol('missing-component');
  const query: symbol[] = [componentA.name, missingSymbol];
  expect(entity.containsAllComponents(query)).toBe(false);
});

test('containsAllComponents returns true for empty query', () => {
  const entity = new Entity('player', world, []);
  const query: symbol[] = [];
  expect(entity.containsAllComponents(query)).toBe(true);
});
