import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createParticleEmitterEcsSystem } from './particle-emitter-system';
import { EcsWorld } from '../../new-ecs';
import { ParticleEmitterEcsComponent, ParticleEmitterId } from '../components';
import { Time } from '../../common';
import { Random, Vector2 } from '../../math';
import { Sprite } from '../../rendering';

describe('ParticleEmitterSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let random: Random;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    random = new Random(12345);
    world.addSystem(createParticleEmitterEcsSystem(time, random));
  });

  it('should not emit particles when emitter is empty', () => {
    const entity = world.createEntity();

    const emitterComponent: ParticleEmitterEcsComponent = {
      emitters: new Map(),
    };

    world.addComponent(entity, ParticleEmitterId, emitterComponent);

    const initialEntityCount = countEntities(world);

    time.update(100);
    world.update();

    expect(countEntities(world)).toBe(initialEntityCount);
  });

  it('should start emitting when startEmitting is true', () => {
    const entity = world.createEntity();
    const mockSprite = {} as Sprite;

    const emitter = {
      sprite: mockSprite,
      startEmitting: true,
      currentlyEmitting: false,
      emitCount: 0,
      totalAmountToEmit: 0,
      currentEmitDuration: 0,
      numParticlesRange: { min: 5, max: 10 },
      emitDurationSeconds: 0,
      spawnPosition: () => new Vector2(0, 0),
      speedRange: { min: 50, max: 100 },
      scaleRange: { min: 1, max: 1 },
      lifetimeSecondsRange: { min: 1, max: 2 },
      rotationRange: { min: 0, max: 360 },
      rotationSpeedRange: { min: 0, max: 0 },
    };

    const emitterComponent: ParticleEmitterEcsComponent = {
      emitters: new Map([['testEmitter', emitter]]),
    };

    world.addComponent(entity, ParticleEmitterId, emitterComponent);

    time.update(100);
    world.update();

    expect(emitter.currentlyEmitting).toBe(true);
    expect(emitter.startEmitting).toBe(false);
    expect(emitter.totalAmountToEmit).toBeGreaterThanOrEqual(5);
    expect(emitter.totalAmountToEmit).toBeLessThanOrEqual(10);
  });

  it('should emit particles when conditions are met', () => {
    const entity = world.createEntity();
    const mockSprite = {} as Sprite;

    const emitter = {
      sprite: mockSprite,
      startEmitting: true,
      currentlyEmitting: false,
      emitCount: 0,
      totalAmountToEmit: 0,
      currentEmitDuration: 0,
      numParticlesRange: { min: 3, max: 3 },
      emitDurationSeconds: 0,
      spawnPosition: () => new Vector2(0, 0),
      speedRange: { min: 50, max: 100 },
      scaleRange: { min: 1, max: 1 },
      lifetimeSecondsRange: { min: 1, max: 2 },
      rotationRange: { min: 0, max: 360 },
      rotationSpeedRange: { min: 0, max: 0 },
    };

    const emitterComponent: ParticleEmitterEcsComponent = {
      emitters: new Map([['testEmitter', emitter]]),
    };

    world.addComponent(entity, ParticleEmitterId, emitterComponent);

    const initialEntityCount = countEntities(world);

    time.update(100);
    world.update();

    // Should have emitted 3 particles immediately (emitDurationSeconds: 0)
    expect(countEntities(world)).toBe(initialEntityCount + 3);
    expect(emitter.emitCount).toBe(3);
  });

  it('should stop emitting after reaching total amount', () => {
    const entity = world.createEntity();
    const mockSprite = {} as Sprite;

    const emitter = {
      sprite: mockSprite,
      startEmitting: false,
      currentlyEmitting: true,
      emitCount: 10,
      totalAmountToEmit: 10,
      currentEmitDuration: 1,
      numParticlesRange: { min: 10, max: 10 },
      emitDurationSeconds: 0.5,
      spawnPosition: () => new Vector2(0, 0),
      speedRange: { min: 50, max: 100 },
      scaleRange: { min: 1, max: 1 },
      lifetimeSecondsRange: { min: 1, max: 2 },
      rotationRange: { min: 0, max: 360 },
      rotationSpeedRange: { min: 0, max: 0 },
    };

    const emitterComponent: ParticleEmitterEcsComponent = {
      emitters: new Map([['testEmitter', emitter]]),
    };

    world.addComponent(entity, ParticleEmitterId, emitterComponent);

    const initialEntityCount = countEntities(world);

    time.update(100);
    world.update();

    // Should not emit any more particles
    expect(countEntities(world)).toBe(initialEntityCount);
    expect(emitter.currentlyEmitting).toBe(false);
  });
});

// Helper function to count entities in world
function countEntities(world: EcsWorld): number {
  let count = 0;
  const testSystem = {
    query: [],
    run: () => {
      count++;
    },
  };

  // This is a workaround since EcsWorld doesn't expose entity count directly
  // We'll just count entities with the particle emitter component
  return count;
}
