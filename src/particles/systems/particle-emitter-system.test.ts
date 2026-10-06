import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createParticleEcsSystem } from './particle-emitter-system.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addParticleEmitterComponent,
  ParticleEmitter,
  ParticleEmitterOptions,
  ParticleId,
} from '../components/index.js';
import {
  addPositionComponent,
  addRotationComponent,
  ageScaleId,
  positionId,
  rotationId,
  scaleId,
  Time,
} from '../../common/index.js';
import { Random, Vec2, Vector2 } from '../../math/index.js';
import { Renderable, Sprite, spriteId } from '../../rendering/index.js';

describe('createParticleEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let random: Random;
  let sprite: Sprite;

  const addEmitter = (
    options: Partial<ParticleEmitterOptions>,
    entity = world.createEntity(),
  ): ParticleEmitter => {
    const emitter = new ParticleEmitter(sprite, options);

    addParticleEmitterComponent(world, entity, {
      emitters: new Map([['test', emitter]]),
    });

    return emitter;
  };

  const getParticles = (): readonly number[] =>
    world.query([ParticleId]).entities;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    random = new Random('test-seed');
    world.addSystem(createParticleEcsSystem(time, random));

    sprite = new Sprite({
      width: 10,
      height: 10,
      renderable: {} as Renderable,
    });
  });

  it('starts emitting when startEmitting is true', () => {
    const emitter = addEmitter({ numParticlesRange: { min: 5, max: 10 } });

    emitter.startEmitting = true;

    time.update(100);
    world.update();

    expect(emitter.currentlyEmitting).toBe(true);
    expect(emitter.startEmitting).toBe(false);
    expect(emitter.totalAmountToEmit).toBeGreaterThanOrEqual(5);
    expect(emitter.totalAmountToEmit).toBeLessThanOrEqual(10);
  });

  it('emits the whole batch at once when emitDurationSeconds is 0', () => {
    const emitter = addEmitter({ numParticlesRange: { min: 3, max: 3 } });

    emitter.emit();

    time.update(100);
    world.update();

    expect(getParticles()).toHaveLength(3);
    expect(emitter.emitCount).toBe(3);
  });

  it('stops emitting after reaching the total amount', () => {
    const emitter = addEmitter({
      numParticlesRange: { min: 10, max: 10 },
      emitDurationSeconds: 0.5,
    });

    emitter.currentlyEmitting = true;
    emitter.emitCount = 10;
    emitter.totalAmountToEmit = 10;
    emitter.currentEmitDuration = 1;

    time.update(100);
    world.update();

    expect(emitter.currentlyEmitting).toBe(false);
  });

  it("spawns particles at the emitter entity's world position", () => {
    const entity = world.createEntity();

    const emitterPosition = addPositionComponent(world, entity);

    // Stands in for the transform system having placed a parented emitter,
    // so the test tells the world position apart from the local one.
    emitterPosition.world = { x: 4, y: -2 };

    const emitter = addEmitter(
      { numParticlesRange: { min: 1, max: 1 } },
      entity,
    );

    emitter.emit();

    time.update(100);
    world.update();

    const [particle] = getParticles();
    const position = world.getComponentRequired(particle, positionId);

    expect(position.world).toEqual({ x: 4, y: -2 });
    expect(position.local).toEqual({ x: 4, y: -2 });
    expect(position.world).not.toBe(position.local);
  });

  it('spawns particles at the world origin when the emitter entity has no position', () => {
    const emitter = addEmitter({ numParticlesRange: { min: 1, max: 1 } });

    emitter.emit();

    time.update(100);
    world.update();

    const [particle] = getParticles();

    expect(world.getComponentRequired(particle, positionId).world).toEqual(
      Vec2.zero,
    );
  });

  it('spawns with the picked scale already in the world scale', () => {
    const emitter = addEmitter({
      numParticlesRange: { min: 1, max: 1 },
      scaleRange: { min: 2, max: 2 },
    });

    emitter.emit();

    time.update(100);
    world.update();

    const [particle] = getParticles();
    const scale = world.getComponentRequired(particle, scaleId);

    expect(scale.world).toEqual({ x: 2, y: 2 });
    expect(scale.local).toEqual({ x: 2, y: 2 });
  });

  it('sets the velocity from the picked speed and direction, with 0 pointing along +X', () => {
    const emitter = addEmitter({
      numParticlesRange: { min: 2, max: 2 },
      speedRange: { min: 5, max: 5 },
      directionRange: { min: Math.PI / 2, max: Math.PI / 2 },
    });

    emitter.emit();

    time.update(100);
    world.update();

    for (const particle of getParticles()) {
      const { velocity } = world.getComponentRequired(particle, ParticleId);

      expect(velocity.x).toBeCloseTo(0);
      expect(velocity.y).toBeCloseTo(5);
    }

    emitter.setOptions({ directionRange: { min: 0, max: 0 } });
    emitter.emit();
    world.update();

    const newest = getParticles().at(-1) ?? -1;
    const { velocity } = world.getComponentRequired(newest, ParticleId);

    expect(velocity.x).toBeCloseTo(5);
    expect(velocity.y).toBeCloseTo(0);
  });

  it('picks from the whole circle for a full-turn range centered off 0', () => {
    addEmitter({
      numParticlesRange: { min: 200, max: 200 },
      directionRange: {
        min: Math.PI / 2 - Math.PI,
        max: Math.PI / 2 + Math.PI,
      },
    }).emit();

    time.update(100);
    world.update();

    const quadrants = new Set(
      getParticles().map((particle) => {
        const { velocity } = world.getComponentRequired(particle, ParticleId);

        return `${Math.sign(velocity.x)},${Math.sign(velocity.y)}`;
      }),
    );

    expect(quadrants).toEqual(new Set(['1,1', '-1,1', '-1,-1', '1,-1']));
  });

  it('keeps the sprite rotation separate from the direction of travel', () => {
    const emitter = addEmitter({
      numParticlesRange: { min: 1, max: 1 },
      speedRange: { min: 1, max: 1 },
      directionRange: { min: 0, max: 0 },
      rotationRange: { min: Math.PI, max: Math.PI },
    });

    emitter.emit();

    time.update(100);
    world.update();

    const [particle] = getParticles();
    const rotation = world.getComponentRequired(particle, rotationId);
    const { velocity } = world.getComponentRequired(particle, ParticleId);

    expect(rotation.local).toBeCloseTo(Math.PI);
    expect(rotation.world).toBeCloseTo(Math.PI);
    expect(velocity.x).toBeCloseTo(1);
  });

  describe('on a rotated emitter entity', () => {
    const addRotatedEmitter = (
      options: Partial<ParticleEmitterOptions>,
    ): ParticleEmitter => {
      const entity = world.createEntity();

      addPositionComponent(world, entity, { local: { x: 10, y: 20 } });

      const emitterRotation = addRotationComponent(world, entity);

      // Stands in for the transform system having turned a parented
      // emitter, so the test tells the world rotation apart from the local
      // one.
      emitterRotation.world = Math.PI / 2;

      return addEmitter(
        { numParticlesRange: { min: 1, max: 1 }, ...options },
        entity,
      );
    };

    const spawnOne = (): {
      position: Vector2;
      velocity: Vector2;
      rotation: number;
    } => {
      time.update(100);
      world.update();

      const [particle] = getParticles();

      return {
        position: world.getComponentRequired(particle, positionId).world,
        velocity: world.getComponentRequired(particle, ParticleId).velocity,
        rotation: world.getComponentRequired(particle, rotationId).world,
      };
    };

    it("turns the direction by the entity's world rotation", () => {
      addRotatedEmitter({
        speedRange: { min: 5, max: 5 },
        directionRange: { min: 0, max: 0 },
      }).emit();

      const { velocity } = spawnOne();

      expect(velocity.x).toBeCloseTo(0);
      expect(velocity.y).toBeCloseTo(5);
    });

    it("turns the spawn shape by the entity's world rotation", () => {
      addRotatedEmitter({
        spawnShape: { type: 'box', width: 8, height: 0 },
      }).emit();

      const { position } = spawnOne();

      // A flat box along the emitter's local X lies along the world's Y.
      expect(position.x).toBeCloseTo(10);
      expect(Math.abs(position.y - 20)).toBeLessThanOrEqual(4);
    });

    it('aims emitOutward particles away from the turned spawn point', () => {
      addRotatedEmitter({
        spawnShape: { type: 'ring', radius: 2 },
        emitOutward: true,
        speedRange: { min: 3, max: 3 },
      }).emit();

      const { position, velocity } = spawnOne();
      const offset = Vec2.subtract(Vec2.clone(position), { x: 10, y: 20 });

      expect(velocity.x).toBeCloseTo((offset.x / 2) * 3);
      expect(velocity.y).toBeCloseTo((offset.y / 2) * 3);
    });

    it("leaves the sprite's rotation in world space", () => {
      addRotatedEmitter({
        rotationRange: { min: 0.25, max: 0.25 },
      }).emit();

      expect(spawnOne().rotation).toBeCloseTo(0.25);
    });
  });

  it('copies acceleration, drag, opacity and the velocity offset onto each particle', () => {
    const getVelocityOffset = (): Vector2 => ({ x: 1, y: 0 });
    const acceleration = { x: 0, y: -9.8 };
    const emitter = addEmitter({
      numParticlesRange: { min: 1, max: 1 },
      acceleration,
      drag: 0.3,
      lifetimeOpacity: { start: 0.8, end: 0 },
      getVelocityOffset,
    });

    emitter.emit();

    time.update(100);
    world.update();

    const [particle] = getParticles();
    const particleComponent = world.getComponentRequired(particle, ParticleId);

    expect(particleComponent).toMatchObject({
      acceleration,
      drag: 0.3,
      startOpacity: 0.8,
      endOpacity: 0,
      getVelocityOffset,
    });
    expect(particleComponent.acceleration).not.toBe(acceleration);
    expect(
      world.getComponentRequired(particle, spriteId).opacityMultiplier,
    ).toBeCloseTo(0.8);
  });

  it('gives each particle its own renderable copy of a plain Sprite', () => {
    const emitter = addEmitter({ numParticlesRange: { min: 2, max: 2 } });

    emitter.emit();

    time.update(100);
    world.update();

    const [first, second] = getParticles().map((particle) =>
      world.getComponentRequired(particle, spriteId),
    );

    expect(first).not.toBe(second);
    expect(first.pivot).not.toBe(second.pivot);
    expect(first.pivot).not.toBe(sprite.pivot);
    expect(first).toMatchObject({
      enabled: true,
      layer: 0,
      width: 10,
      height: 10,
      renderable: sprite.renderable,
      uvOffset: { x: 0, y: 0 },
      uvScale: { x: 1, y: 1 },
    });
  });

  it("draws particles on the sprite's layer", () => {
    const emitter = new ParticleEmitter(
      { width: 1, height: 1, renderable: {} as Renderable, layer: 3 },
      { numParticlesRange: { min: 1, max: 1 } },
    );

    addParticleEmitterComponent(world, world.createEntity(), {
      emitters: new Map([['test', emitter]]),
    });

    emitter.emit();

    time.update(100);
    world.update();

    const [particle] = getParticles();

    expect(world.getComponentRequired(particle, spriteId).layer).toBe(3);
  });

  it('shrinks to the spawned scale times lifetimeScaleReduction', () => {
    const emitter = addEmitter({
      numParticlesRange: { min: 1, max: 1 },
      scaleRange: { min: 2, max: 2 },
      lifetimeScaleReduction: 0.5,
    });

    emitter.emit();

    time.update(100);
    world.update();

    const [particle] = getParticles();

    expect(world.getComponent(particle, ageScaleId)).toEqual({
      originalScaleX: 2,
      originalScaleY: 2,
      finalLifetimeScaleX: 1,
      finalLifetimeScaleY: 1,
    });
  });

  it('calls onParticleSpawned for every particle', () => {
    const onParticleSpawned = vi.fn();
    const emitter = addEmitter({
      numParticlesRange: { min: 3, max: 3 },
      onParticleSpawned,
    });

    emitter.emit();

    time.update(100);
    world.update();

    expect(onParticleSpawned).toHaveBeenCalledTimes(3);

    for (const particle of getParticles()) {
      expect(onParticleSpawned).toHaveBeenCalledWith(world, particle);
    }
  });

  describe('emissionRate', () => {
    it('streams particles steadily without calling emit', () => {
      addEmitter({ emissionRate: 12 });

      for (let frame = 0; frame < 60; frame++) {
        time.update(frame * (1000 / 60));
        world.update();
      }

      // 59 frames of 1/60 second each have elapsed since the first update.
      expect(getParticles()).toHaveLength(Math.floor((59 / 60) * 12));
    });

    it('carries the fraction of a particle over to the next frame', () => {
      const emitter = addEmitter({ emissionRate: 15 });

      time.update(50);
      world.update();

      expect(getParticles()).toHaveLength(0);
      expect(emitter.emissionRemainder).toBeCloseTo(0.75);

      time.update(100);
      world.update();

      expect(getParticles()).toHaveLength(1);
      expect(emitter.emissionRemainder).toBeCloseTo(0.5);
    });

    it('stops streaming when set back to 0', () => {
      const emitter = addEmitter({ emissionRate: 100 });

      time.update(0);
      time.update(100);
      world.update();

      const count = getParticles().length;

      emitter.setOptions({ emissionRate: 0 });
      time.update(200);
      world.update();

      expect(getParticles()).toHaveLength(count);
      expect(emitter.emissionRemainder).toBe(0);
    });
  });
});
