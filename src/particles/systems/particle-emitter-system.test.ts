import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createParticleEcsSystem } from './particle-emitter-system';
import { EcsWorld } from '../../ecs';
import {
  addParticleEmitterComponent,
  ParticleEmitter,
  ParticleId,
} from '../components';
import { rotationId, Time } from '../../common';
import {
  createVector2,
  degreesToRadians,
  Random,
  vector2Zero,
} from '../../math';
import { Sprite } from '../../rendering';

describe('ParticleEmitterSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let random: Random;
  let mockSprite: Sprite;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    random = new Random('test-seed');
    world.addSystem(createParticleEcsSystem(time, random));

    // Create a mock sprite object with all required properties
    mockSprite = {
      width: 10,
      height: 10,
      bleed: 1,
      pivot: createVector2(0.5, 0.5),
      tintColor: { r: 1, g: 1, b: 1, a: 1 },
      renderable: {
        geometry: vi.fn(),
        material: vi.fn(),
        floatsPerInstance: 0,
        layer: 0,
        bindInstanceData: vi.fn(),
        setupInstanceAttributes: vi.fn(),
        bind: vi.fn(),
        draw: vi.fn(),
      },
    } as unknown as Sprite;
  });

  it('should start emitting when startEmitting is true', () => {
    const entity = world.createEntity();

    const emitter = new ParticleEmitter(mockSprite, 0, {
      numParticlesRange: { min: 5, max: 10 },
      speedRange: { min: 50, max: 100 },
      scaleRange: { min: 1, max: 1 },
      lifetimeSecondsRange: { min: 1, max: 2 },
      rotationRange: { min: 0, max: 360 },
      rotationSpeedRange: { min: 0, max: 0 },
      emitDurationSeconds: 0,
      spawnPosition: () => vector2Zero(),
    });

    emitter.startEmitting = true;

    addParticleEmitterComponent(world, entity, {
      emitters: new Map([['testEmitter', emitter]]),
    });

    time.update(100);
    world.update();

    expect(emitter.currentlyEmitting).toBe(true);
    expect(emitter.startEmitting).toBe(false);
    expect(emitter.totalAmountToEmit).toBeGreaterThanOrEqual(5);
    expect(emitter.totalAmountToEmit).toBeLessThanOrEqual(10);
  });

  it('should emit particles when conditions are met', () => {
    const entity = world.createEntity();

    const emitter = new ParticleEmitter(mockSprite, 0, {
      numParticlesRange: { min: 3, max: 3 },
      speedRange: { min: 50, max: 100 },
      scaleRange: { min: 1, max: 1 },
      lifetimeSecondsRange: { min: 1, max: 2 },
      rotationRange: { min: 0, max: 360 },
      rotationSpeedRange: { min: 0, max: 0 },
      emitDurationSeconds: 0,
      spawnPosition: () => vector2Zero(),
    });

    emitter.startEmitting = true;

    addParticleEmitterComponent(world, entity, {
      emitters: new Map([['testEmitter', emitter]]),
    });

    time.update(100);
    world.update();

    // Query for particles after they should have been created
    const { entities: particlesAfter } = world.query([ParticleId]);

    // Should have emitted 3 particles immediately (emitDurationSeconds: 0)
    expect(particlesAfter).toHaveLength(3);
    expect(emitter.emitCount).toBe(3);
  });

  it('should store the spawned rotation in radians, converted from the configured degrees', () => {
    const entity = world.createEntity();

    const emitter = new ParticleEmitter(mockSprite, 0, {
      numParticlesRange: { min: 1, max: 1 },
      speedRange: { min: 0, max: 0 },
      scaleRange: { min: 1, max: 1 },
      lifetimeSecondsRange: { min: 1, max: 1 },
      rotationRange: { min: 180, max: 180 },
      rotationSpeedRange: { min: 0, max: 0 },
      emitDurationSeconds: 0,
      spawnPosition: () => vector2Zero(),
    });

    emitter.startEmitting = true;

    addParticleEmitterComponent(world, entity, {
      emitters: new Map([['testEmitter', emitter]]),
    });

    time.update(100);
    world.update();

    const { entities: particlesAfter } = world.query([ParticleId]);

    const [particleEntity] = particlesAfter;
    const rotation = world.getComponent(particleEntity, rotationId);

    expect(rotation?.local).toBeCloseTo(degreesToRadians(180));
  });

  it('should stop emitting after reaching total amount', () => {
    const entity = world.createEntity();

    const emitter = new ParticleEmitter(mockSprite, 0, {
      numParticlesRange: { min: 10, max: 10 },
      speedRange: { min: 50, max: 100 },
      scaleRange: { min: 1, max: 1 },
      lifetimeSecondsRange: { min: 1, max: 2 },
      rotationRange: { min: 0, max: 360 },
      rotationSpeedRange: { min: 0, max: 0 },
      emitDurationSeconds: 0.5,
      spawnPosition: () => vector2Zero(),
    });

    // Manually set emitter state as if it has already emitted all particles
    emitter.currentlyEmitting = true;
    emitter.emitCount = 10;
    emitter.totalAmountToEmit = 10;
    emitter.currentEmitDuration = 1;

    addParticleEmitterComponent(world, entity, {
      emitters: new Map([['testEmitter', emitter]]),
    });

    time.update(100);
    world.update();

    expect(emitter.currentlyEmitting).toBe(false);
  });
});
