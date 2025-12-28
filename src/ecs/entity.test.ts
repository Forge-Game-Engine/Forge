import { Entity } from './entity';
import { expect, test } from 'vitest';
import { Component } from './types';
import { World } from './world';

class MockComponent1 extends Component {}
class MockComponent2 extends Component {}

const world = new World('test-world');

test('creating an entity with no name', () => {
  const entity = new Entity(world, []);

  expect(entity).not.toBe(null);
  expect(entity.name).toBe('<anonymous entity>');
});

test('creating an entity', () => {
  const entity = new Entity(world, [], {
    name: 'player',
  });

  expect(entity).not.toBe(null);
  expect(entity.name).toBe('player');
});

test('adding a component', () => {
  const entity = new Entity(world, []);
  const component = new MockComponent1();

  entity.addComponents(component);

  expect(entity.getComponent(MockComponent1)).not.toBeNull();
});

test('removing a component', () => {
  const component = new MockComponent1();
  const entity = new Entity(world, [component]);

  entity.removeComponents(MockComponent1);

  expect(entity.getComponent(MockComponent1)).toBeNull();
});

test("parentTo sets the parent and adds to parent's children", () => {
  const parent = new Entity(world, []);
  const child = new Entity(world, []);

  child.parentTo(parent);

  expect(child.parent).toBe(parent);
  expect(parent.children.has(child)).toBe(true);
});

test("parentTo removes child from previous parent's children", () => {
  const parent1 = new Entity(world, []);
  const parent2 = new Entity(world, []);
  const child = new Entity(world, []);

  child.parentTo(parent1);
  expect(parent1.children.has(child)).toBe(true);

  child.parentTo(parent2);
  expect(child.parent).toBe(parent2);
  expect(parent2.children.has(child)).toBe(true);
  expect(parent1.children.has(child)).toBe(false);
});

test('removeParent removes the parent', () => {
  const parent1 = new Entity(world, []);
  const child = new Entity(world, []);

  child.parentTo(parent1);
  expect(parent1.children.has(child)).toBe(true);

  child.removeParent();
  expect(child.parent).toBe(null);
  expect(parent1.children.has(child)).toBe(false);
});

test('creating an entity with a parent in constructor', () => {
  const parent = new Entity(world, []);
  const child = new Entity(world, [], { parent });

  expect(child.parent).toBe(parent);
  expect(parent.children.has(child)).toBe(true);
});

test('creating an entity with enabled=false in constructor', () => {
  const entity = new Entity(world, [], { enabled: false });

  expect(entity.enabled).toBe(false);
});

test('addComponents throws when adding a component that already exists', () => {
  const entity = new Entity(world, [new MockComponent1()]);

  expect(() => entity.addComponents(new MockComponent1())).toThrowError(
    `Unable to add component "${MockComponent1.id.toString()}" to entity "${entity.name}", it already exists on the entity.`,
  );
});

test('addComponents does not throw when adding a second component that does not exists', () => {
  const entity = new Entity(world, [new MockComponent1()]);

  expect(() => entity.addComponents(new MockComponent2())).not.toThrowError();
});
