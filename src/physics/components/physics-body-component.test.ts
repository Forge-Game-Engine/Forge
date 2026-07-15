import { describe, expect, it } from 'vitest';
import {
  addPhysicsBodyComponent,
  PhysicsBodyId,
} from './physics-body-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleShape } from '../shapes/circle-shape.js';
import { RigidBody } from '../rigid-body.js';

const createRigidBody = (): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position: Vector2.zero });

describe('addPhysicsBodyComponent', () => {
  it('attaches a component with the given physics body', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const physicsBody = createRigidBody();

    addPhysicsBodyComponent(world, entity, { physicsBody });

    expect(world.getComponent(entity, PhysicsBodyId)).toEqual({
      physicsBody,
    });
  });

  it('applies the provided isKinematic option', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const physicsBody = createRigidBody();

    addPhysicsBodyComponent(world, entity, { physicsBody, isKinematic: true });

    expect(world.getComponent(entity, PhysicsBodyId)).toEqual({
      physicsBody,
      isKinematic: true,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const physicsBody = createRigidBody();

    const component = addPhysicsBodyComponent(world, entity, { physicsBody });

    expect(world.getComponent(entity, PhysicsBodyId)).toBe(component);
  });
});
