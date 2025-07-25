import type { Component } from '../../ecs';
import { ForgeRenderLayer, Renderable } from '../../rendering';
import { ParticleComponent } from './particle-component';

export interface MinMax {
  min: number;
  max: number;
}

export interface ParticleEmitterOptions {
  numParticles: MinMax;
  speed: MinMax;
  scale: MinMax;
  rotation: MinMax;
  rotationSpeed: MinMax;
  lifetime: MinMax;
  lifetimeScaleReduction: number;
  height: number;
  width: number;
  emitDuration: number;
  positionX: number;
  positionY: number;
}

const defaultOptions: ParticleEmitterOptions = {
  numParticles: { min: 5, max: 10 },
  speed: { min: 10, max: 20 },
  scale: { min: 1, max: 1 },
  rotation: { min: 0, max: 2 * Math.PI },
  rotationSpeed: { min: 0, max: 0 },
  lifetime: { min: 1, max: 3 },
  lifetimeScaleReduction: 0,
  height: 10,
  width: 10,
  emitDuration: 0,
  positionX: 0,
  positionY: 0,
};

export class ParticleEmitterComponent implements Component {
  public name: symbol;
  public emitters: Map<string, ParticleEmitter> = new Map();
  public static readonly symbol = Symbol('ParticleEmitter');

  constructor(emitters: { name: string; emitter: ParticleEmitter }[]) {
    this.name = ParticleEmitterComponent.symbol;

    for (const { name, emitter } of emitters) {
      this.emitters.set(name, emitter);
    }
  }
}

export class ParticleEmitter {
  public renderable: Renderable;
  public renderLayer: ForgeRenderLayer;
  public positionX: number = 0;
  public positionY: number = 0;
  public particles: ParticleComponent[] = [];
  public numParticles: MinMax;
  public speed: MinMax;
  public scale: MinMax;
  public rotation: MinMax; // In radians
  public rotationSpeed: MinMax;
  public lifetime: MinMax;
  public lifetimeScaleReduction: number; // The particle scale at the end of its lifetime will be scale * lifetimeScaleReduction
  public height: number;
  public width: number;
  public emitDuration: number; // How long the emitter will emit particles
  public emitStartTime: number = 0;
  public emitCount: number = 0;
  public amountToEmit: number = 0;
  public startEmitting: boolean = false;
  public currentlyEmitting: boolean = false;

  constructor(
    renderable: Renderable,
    renderLayer: ForgeRenderLayer,
    options: Partial<ParticleEmitterOptions> = {},
  ) {
    const {
      numParticles,
      speed,
      scale,
      rotation,
      rotationSpeed,
      lifetime,
      lifetimeScaleReduction,
      height,
      width,
      emitDuration,
      positionX,
      positionY,
    } = {
      ...defaultOptions,
      ...options,
    };
    this.renderable = renderable;
    this.renderLayer = renderLayer;
    this.numParticles = numParticles;
    this.speed = speed;
    this.scale = scale;
    this.rotation = rotation;
    this.rotationSpeed = rotationSpeed;
    this.lifetime = lifetime;
    this.lifetimeScaleReduction = lifetimeScaleReduction;
    this.height = height;
    this.width = width;
    this.emitDuration = emitDuration;
    this.positionX = positionX;
    this.positionY = positionY;
  }

  public setOptions(options: Partial<ParticleEmitterOptions>): void {
    const {
      numParticles,
      speed,
      scale,
      rotation,
      rotationSpeed,
      lifetime,
      lifetimeScaleReduction,
      height,
      width,
      emitDuration,
      positionX,
      positionY,
    } = {
      ...this,
      ...options,
    };

    this.numParticles = numParticles;
    this.speed = speed;
    this.scale = scale;
    this.rotation = rotation;
    this.rotationSpeed = rotationSpeed;
    this.lifetime = lifetime;
    this.lifetimeScaleReduction = lifetimeScaleReduction;
    this.height = height;
    this.width = width;
    this.emitDuration = emitDuration;
    this.positionX = positionX;
    this.positionY = positionY;
  }

  // Only emits if not already emitting
  public emit(): void {
    if (!this.currentlyEmitting) {
      this.startEmitting = true;
    }
  }
}
