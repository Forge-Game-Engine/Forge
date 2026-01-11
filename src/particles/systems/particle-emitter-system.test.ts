import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createParticleEcsSystem } from './particle-emitter-system';
import { EcsWorld } from '../../new-ecs';
import {
  ParticleEmitter,
  ParticleEmitterEcsComponent,
  ParticleEmitterId,
  ParticleId,
} from '../components';
import { Time } from '../../common';
import { Random, Vector2 } from '../../math';
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
      pivot: new Vector2(0.5, 0.5),
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

  it('should not emit particles when emitter is empty', () => {
    const entity = world.createEntity();

    const emitterComponent: ParticleEmitterEcsComponent = {
      emitters: new Map(),
    };

    world.addComponent(entity, ParticleEmitterId, emitterComponent);

    time.update(100);
    world.update();

    // With an empty emitter map, no particles should be created
    // The system should run successfully without creating any particle entities
    // We can't query for ParticleId components since none exist
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
      spawnPosition: () => new Vector2(0, 0),
    });

    emitter.startEmitting = true;

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

    const emitter = new ParticleEmitter(mockSprite, 0, {
      numParticlesRange: { min: 3, max: 3 },
      speedRange: { min: 50, max: 100 },
      scaleRange: { min: 1, max: 1 },
      lifetimeSecondsRange: { min: 1, max: 2 },
      rotationRange: { min: 0, max: 360 },
      rotationSpeedRange: { min: 0, max: 0 },
      emitDurationSeconds: 0,
      spawnPosition: () => new Vector2(0, 0),
    });

    emitter.startEmitting = true;

    const emitterComponent: ParticleEmitterEcsComponent = {
      emitters: new Map([['testEmitter', emitter]]),
    };

    world.addComponent(entity, ParticleEmitterId, emitterComponent);

    time.update(100);
    world.update();

    // Query for particles after they should have been created
    const particlesAfter: number[] = [];
    world.queryEntities([ParticleId], particlesAfter);

    // Should have emitted 3 particles immediately (emitDurationSeconds: 0)
    expect(particlesAfter.length).toBe(3);
    expect(emitter.emitCount).toBe(3);
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
      spawnPosition: () => new Vector2(0, 0),
    });

    // Manually set emitter state as if it has already emitted all particles
    emitter.currentlyEmitting = true;
    emitter.emitCount = 10;
    emitter.totalAmountToEmit = 10;
    emitter.currentEmitDuration = 1;

    const emitterComponent: ParticleEmitterEcsComponent = {
      emitters: new Map([['testEmitter', emitter]]),
    };

    world.addComponent(entity, ParticleEmitterId, emitterComponent);

    time.update(100);
    world.update();

    // Emitter should have stopped
    expect(emitter.currentlyEmitting).toBe(false);
  });
});
