import { describe, expect, it, vi } from 'vitest';
import { ParticleEmitter } from './particle-emitter.js';
import { Renderable } from '../../rendering/index.js';

const sprite = {
  width: 1,
  height: 1,
  renderable: {} as Renderable,
};

describe('ParticleEmitter', () => {
  it('uses the defaults for options that are left out', () => {
    const emitter = new ParticleEmitter(sprite);

    expect(emitter.directionRange).toEqual({ min: 0, max: 360 });
    expect(emitter.rotationRange).toEqual({ min: 0, max: 0 });
    expect(emitter.lifetimeOpacity).toEqual({ start: 1, end: 1 });
    expect(emitter.acceleration).toEqual({ x: 0, y: 0 });
    expect(emitter.drag).toBe(1);
    expect(emitter.spawnShape).toEqual({ type: 'point' });
    expect(emitter.emitOutward).toBe(false);
    expect(emitter.emissionRate).toBe(0);
    expect(emitter.getVelocityOffset).toBeUndefined();
    expect(emitter.onParticleSpawned).toBeUndefined();
  });

  it.each([-0.1, 1.5])('throws for a drag of %s', (drag) => {
    expect(() => new ParticleEmitter(sprite, { drag })).toThrow(/drag/);
  });

  it('throws for a negative emission rate', () => {
    expect(() => new ParticleEmitter(sprite, { emissionRate: -1 })).toThrow(
      /emissionRate/,
    );
  });

  it('changes only the options passed to setOptions', () => {
    const onParticleSpawned = vi.fn();
    const emitter = new ParticleEmitter(sprite, { drag: 0.5 });

    emitter.setOptions({ emissionRate: 12, onParticleSpawned });

    expect(emitter.emissionRate).toBe(12);
    expect(emitter.onParticleSpawned).toBe(onParticleSpawned);
    expect(emitter.drag).toBe(0.5);
    expect(emitter.sprite).toBe(sprite);
  });

  it('validates the options passed to setOptions', () => {
    const emitter = new ParticleEmitter(sprite);

    expect(() => emitter.setOptions({ drag: 2 })).toThrow(/drag/);
  });

  it('starts an emission on emit, and only when idle on emitIfNotEmitting', () => {
    const emitter = new ParticleEmitter(sprite);

    emitter.currentlyEmitting = true;
    emitter.emitIfNotEmitting();

    expect(emitter.startEmitting).toBe(false);

    emitter.emit();

    expect(emitter.startEmitting).toBe(true);
  });
});
