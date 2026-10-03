import { beforeEach, describe, expect, it } from 'vitest';
import { createParticlePositionEcsSystem } from './particle-position-system.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addParticleComponent,
  ParticleId,
} from '../components/particle-component.js';
import {
  addPositionComponent,
  addRotationComponent,
  positionId,
  rotationId,
  Time,
} from '../../common/index.js';

describe('createParticlePositionEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    world.addSystem(createParticlePositionEcsSystem(time));
  });

  const createParticle = (
    options: Parameters<typeof addParticleComponent>[2] = {},
  ): number => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addRotationComponent(world, entity);
    addParticleComponent(world, entity, options);

    return entity;
  };

  it('moves the particle by its velocity', () => {
    const entity = createParticle({ velocity: { x: 10, y: -20 } });
    const position = world.getComponentRequired(entity, positionId);

    time.update(100);
    world.update();

    expect(position.local.x).toBeCloseTo(1);
    expect(position.local.y).toBeCloseTo(-2);
  });

  it('adds the acceleration to the velocity', () => {
    const entity = createParticle({ acceleration: { x: 0, y: -10 } });
    const particle = world.getComponentRequired(entity, ParticleId);

    time.update(100);
    world.update();

    expect(particle.velocity.y).toBeCloseTo(-1);
  });

  it('keeps the drag share of the velocity per second', () => {
    const entity = createParticle({ velocity: { x: 8, y: 0 }, drag: 0.25 });
    const particle = world.getComponentRequired(entity, ParticleId);

    // The first update's delta isn't clamped, so this is a whole second.
    time.update(1000);
    world.update();

    expect(particle.velocity.x).toBeCloseTo(2);
  });

  it('adds the velocity offset to the movement without slowing it with drag', () => {
    let worldSpeed = 5;
    const entity = createParticle({
      drag: 0,
      getVelocityOffset: () => ({ x: -worldSpeed, y: 0 }),
    });
    const position = world.getComponentRequired(entity, positionId);

    time.update(100);
    world.update();

    expect(position.local.x).toBeCloseTo(-0.5);

    worldSpeed = 10;
    time.update(150);
    world.update();

    expect(position.local.x).toBeCloseTo(-1);
  });

  it('spins the sprite by the rotation speed without changing the direction of travel', () => {
    const entity = createParticle({
      velocity: { x: 0, y: 10 },
      rotationSpeed: Math.PI,
    });
    const rotation = world.getComponentRequired(entity, rotationId);
    const position = world.getComponentRequired(entity, positionId);

    time.update(500);
    world.update();

    expect(rotation.local).toBeCloseTo(Math.PI / 2);
    expect(position.local.x).toBeCloseTo(0);
    expect(position.local.y).toBeCloseTo(5);
  });
});
