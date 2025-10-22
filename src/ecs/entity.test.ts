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

test('creating an entity with a parent in constructor', () => {
  const parent = new Entity('parent', world, []);
  const child = new Entity('child', world, [], { parent });

  expect(child.parent).toBe(parent);
  expect(parent.children.has(child)).toBe(true);
});

test('creating an entity with enabled=false in constructor', () => {
  const entity = new Entity('disabled-entity', world, [], { enabled: false });

  expect(entity.enabled).toBe(false);
});

test('addComponents throws when adding a component that already exists', () => {
  const entity = new Entity('player', world, [new MockComponent()]);

  expect(() => entity.addComponents(new MockComponent())).toThrowError(
    `Unable to add component "${MockComponent.symbol.toString()}" to entity "${entity.name}", it already exists on the entity.`,
  );
});
