import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParticleEmitterSystem } from './particle-emitter-system';
import { Entity, World } from '../../ecs';
import { ParticleEmitter, ParticleEmitterComponent } from '../components';
import { RenderLayerComponent, Sprite } from '../../rendering';

describe('_startEmittingParticles', () => {
  const world: World = new World('test');
  const system = new ParticleEmitterSystem(world);
  const mockSprite = {} as Sprite; // Mock sprite object
  const mockRenderLayer = {} as RenderLayerComponent; // Mock render layer object

  it('should start emitting when startEmitting is true', () => {
    const emitter = new ParticleEmitter(mockSprite, mockRenderLayer, {
      numParticlesRange: { min: 5, max: 10 },
    });
    const emitterComponent = new ParticleEmitterComponent(
      new Map([['testEmitter', emitter]]),
    );
    const entity = new Entity('emitter', world, [emitterComponent]);

    expect(emitter.startEmitting).toBe(false);
    expect(emitter.currentlyEmitting).toBe(false);

    emitter.startEmitting = true;
    system.run(entity);

    expect(emitter.startEmitting).toBe(false);
    expect(emitter.currentEmitDuration).toBe(0);
    expect(emitter.emitCount).toBeGreaterThan(0);
    expect(emitter.currentlyEmitting).toBe(true);
    expect(emitter.totalAmountToEmit).toBeGreaterThanOrEqual(5);
    expect(emitter.totalAmountToEmit).toBeLessThanOrEqual(10);
  });

  it('should not start emitting when startEmitting is false', () => {
    const emitter = new ParticleEmitter(mockSprite, mockRenderLayer, {
      numParticlesRange: { min: 5, max: 10 },
    });
    const emitterComponent = new ParticleEmitterComponent(
      new Map([['testEmitter', emitter]]),
    );
    const entity = new Entity('emitter', world, [emitterComponent]);

    expect(emitter.startEmitting).toBe(false);
    expect(emitter.currentlyEmitting).toBe(false);

    system.run(entity);

    expect(emitter.startEmitting).toBe(false);
    expect(emitter.currentEmitDuration).toBe(0);
    expect(emitter.emitCount).toBe(0);
    expect(emitter.currentlyEmitting).toBe(false);
    expect(emitter.totalAmountToEmit).toBeLessThan(5);
  });
});

describe('ParticleEmitterSystem', () => {
  let world: World;
  beforeEach(() => {
    world = new World('test');
  });

  it('should process all emitters in the entity', () => {
    const system = new ParticleEmitterSystem(world);
    const mockSprite = {} as Sprite;
    const mockRenderLayer = {} as RenderLayerComponent;

    // Create multiple emitters
    const emitter1 = new ParticleEmitter(mockSprite, mockRenderLayer, {
      numParticlesRange: { min: 5, max: 10 },
    });
    const emitter2 = new ParticleEmitter(mockSprite, mockRenderLayer, {
      numParticlesRange: { min: 3, max: 7 },
    });

    const emitterComponent = new ParticleEmitterComponent(
      new Map([
        ['emitter1', emitter1],
        ['emitter2', emitter2],
      ]),
    );

    const entity = world.buildAndAddEntity('emitter', [emitterComponent]);

    // Mock time delta
    vi.spyOn(world.time, 'deltaTimeInSeconds', 'get').mockReturnValue(0.1);

    const initialDuration1 = emitter1.currentEmitDuration;
    const initialDuration2 = emitter2.currentEmitDuration;

    system.run(entity);

    // Both emitters should have their duration updated
    expect(emitter1.currentEmitDuration).toBe(initialDuration1 + 0.1);
    expect(emitter2.currentEmitDuration).toBe(initialDuration2 + 0.1);
  });
});

describe('_emitNewParticles', () => {
  let world: World;
  let system: ParticleEmitterSystem;
  const mockSprite = {} as Sprite;
  const mockRenderLayer = {} as RenderLayerComponent;
  beforeEach(() => {
    world = new World('test');
    system = new ParticleEmitterSystem(world);
    world.addSystem(system);
  });

  it('should not emit when not currently emitting', () => {
    const emitter = new ParticleEmitter(mockSprite, mockRenderLayer, {
      numParticlesRange: { min: 5, max: 10 },
    });

    emitter.currentlyEmitting = false;

    const emitterComponent = new ParticleEmitterComponent(
      new Map([['emitter', emitter]]),
    );

    world.buildAndAddEntity('emitter', [emitterComponent]);

    const initialEntityCount = world.entityCount;

    world.update(0.1);

    expect(world.entityCount).toBe(initialEntityCount);
    expect(emitter.currentlyEmitting).toBe(false);
  });

  it('should not emit when emit count exceeds total amount', () => {
    const emitter = new ParticleEmitter(mockSprite, mockRenderLayer, {
      numParticlesRange: { min: 5, max: 10 },
    });

    emitter.currentlyEmitting = true;
    emitter.totalAmountToEmit = 5;
    emitter.emitCount = 5;

    const emitterComponent = new ParticleEmitterComponent(
      new Map([['emitter', emitter]]),
    );

    world.buildAndAddEntity('emitter', [emitterComponent]);

    const initialEntityCount = world.entityCount;

    world.update(0.1);

    expect(world.entityCount).toBe(initialEntityCount);
    expect(emitter.currentlyEmitting).toBe(false);
  });

  it('should emit particles when conditions are met', () => {
    const emitter = new ParticleEmitter(mockSprite, mockRenderLayer, {
      numParticlesRange: { min: 3, max: 3 },
      emitDurationSeconds: 0, // Immediate emission
    });

    emitter.startEmitting = true;

    const emitterComponent = new ParticleEmitterComponent(
      new Map([['emitter', emitter]]),
    );

    world.buildAndAddEntity('emitter', [emitterComponent]);

    const initialEntityCount = world.entityCount;

    world.update(0.1);

    expect(world.entityCount).toBe(initialEntityCount + 3);
    expect(emitter.emitCount).toBe(3);
    expect(emitter.currentlyEmitting).toBe(true);
  });
  it('should stop emitting after emitting everything', () => {
    const emitter = new ParticleEmitter(mockSprite, mockRenderLayer, {
      numParticlesRange: { min: 10, max: 10 },
      emitDurationSeconds: 0.5,
    });

    emitter.startEmitting = true;

    const emitterComponent = new ParticleEmitterComponent(
      new Map([['emitter', emitter]]),
    );

    world.buildAndAddEntity('emitter', [emitterComponent]);

    world.update(0 * 1000);

    expect(emitter.currentlyEmitting).toBe(true);
    expect(world.entityCount).toBe(1);
    world.update(0.5 * 1000);

    expect(emitter.currentlyEmitting).toBe(true);
    expect(world.entityCount).toBe(11);
    world.update(1 * 1000);

    expect(emitter.currentlyEmitting).toBe(false);
    expect(world.entityCount).toBe(11);
  });
});

describe('_getAmountToEmitBasedOnDuration', () => {
  let world: World;
  let system: ParticleEmitterSystem;
  const mockSprite = {} as Sprite;
  const mockRenderLayer = {} as RenderLayerComponent;
  beforeEach(() => {
    world = new World('test');
    system = new ParticleEmitterSystem(world);
  });

  it('should calculate correct amount based on progress', () => {
    const emitter = new ParticleEmitter(mockSprite, mockRenderLayer, {
      emitDurationSeconds: 2,
    });

    emitter.currentlyEmitting = true;
    emitter.totalAmountToEmit = 10;
    emitter.currentEmitDuration = 1; // 50% progress

    const emitterComponent = new ParticleEmitterComponent(
      new Map([['emitter', emitter]]),
    );

    const entity = world.buildAndAddEntity('emitter', [emitterComponent]);

    expect(world.entityCount).toBe(1);
    system.run(entity);

    expect(world.entityCount).toBe(1 + 5);
  });

  it('should not exceed total amount when progress is complete', () => {
    const emitter = new ParticleEmitter(mockSprite, mockRenderLayer, {
      emitDurationSeconds: 2,
    });

    emitter.currentlyEmitting = true;
    emitter.totalAmountToEmit = 10;
    emitter.currentEmitDuration = 4; // 200% progress

    const emitterComponent = new ParticleEmitterComponent(
      new Map([['emitter', emitter]]),
    );

    const entity = world.buildAndAddEntity('emitter', [emitterComponent]);

    expect(world.entityCount).toBe(1);
    system.run(entity);

    expect(world.entityCount).toBe(1 + 10);
  });
});

describe('_getRandomValueInRange', () => {
  let world: World;
  let system: ParticleEmitterSystem;
  const mockSprite = {} as Sprite;
  const mockRenderLayer = {} as RenderLayerComponent;
  beforeEach(() => {
    world = new World('test');
    system = new ParticleEmitterSystem(world);
    world.addSystem(system);
  });

  it('should return value within normal range', () => {
    const emitter = new ParticleEmitter(mockSprite, mockRenderLayer, {
      numParticlesRange: { min: 5, max: 7 },
      emitDurationSeconds: 0,
    });

    emitter.startEmitting = true;

    const emitterComponent = new ParticleEmitterComponent(
      new Map([['emitter', emitter]]),
    );

    world.buildAndAddEntity('emitter', [emitterComponent]);

    world.update(0);

    expect(emitter.totalAmountToEmit).toBeLessThanOrEqual(7);
    expect(emitter.totalAmountToEmit).toBeGreaterThanOrEqual(5);
  });

  it('should handle when min > max', () => {
    const emitter = new ParticleEmitter(mockSprite, mockRenderLayer, {
      numParticlesRange: { min: 10, max: 8 },
      emitDurationSeconds: 0,
    });

    emitter.startEmitting = true;

    const emitterComponent = new ParticleEmitterComponent(
      new Map([['emitter', emitter]]),
    );

    world.buildAndAddEntity('emitter', [emitterComponent]);

    world.update(0);

    expect(emitter.totalAmountToEmit).toBeLessThanOrEqual(10);
    expect(emitter.totalAmountToEmit).toBeGreaterThanOrEqual(8);
  });

  it('should handle equal min and max values', () => {
    const emitter = new ParticleEmitter(mockSprite, mockRenderLayer, {
      numParticlesRange: { min: 12, max: 12 },
      emitDurationSeconds: 0,
    });

    emitter.startEmitting = true;

    const emitterComponent = new ParticleEmitterComponent(
      new Map([['emitter', emitter]]),
    );

    world.buildAndAddEntity('emitter', [emitterComponent]);

    world.update(0);

    expect(emitter.totalAmountToEmit).toBe(12);
  });
});
