import type { Component } from '../../ecs';
import { ForgeRenderLayer, Sprite } from '../../rendering';

export type positionFunction = () => number;

export interface MinMax {
  min: number;
  max: number;
}

export interface ParticleEmitterOptions {
  numParticlesRange: MinMax;
  speedRange: MinMax;
  scaleRange: MinMax;
  rotationRange: MinMax;
  rotationSpeedRange: MinMax;
  lifetimeSecondsRange: MinMax;
  lifetimeScaleReduction: number;
  height: number;
  width: number;
  emitDurationSeconds: number;
  positionX: positionFunction;
  positionY: positionFunction;
}

const defaultOptions: ParticleEmitterOptions = {
  numParticlesRange: { min: 5, max: 10 },
  speedRange: { min: 10, max: 20 },
  scaleRange: { min: 1, max: 1 },
  rotationRange: { min: 0, max: 360 },
  rotationSpeedRange: { min: 0, max: 0 },
  lifetimeSecondsRange: { min: 1, max: 3 },
  lifetimeScaleReduction: 0,
  height: 10,
  width: 10,
  emitDurationSeconds: 0,
  positionX: () => 0,
  positionY: () => 0,
};

export class ParticleEmitterComponent implements Component {
  public name: symbol;
  public emitters: Map<string, ParticleEmitter>;
  public static readonly symbol = Symbol('ParticleEmitter');

  constructor(emitters: { name: string; emitter: ParticleEmitter }[]) {
    this.name = ParticleEmitterComponent.symbol;
    this.emitters = new Map();

    for (const { name, emitter } of emitters) {
      this.emitters.set(name, emitter);
    }
  }
}

export class ParticleEmitter {
  public sprite: Sprite;
  public renderLayer: ForgeRenderLayer;
  public positionX: positionFunction;
  public positionY: positionFunction;
  public numParticlesRange: MinMax;
  public speedRange: MinMax;
  public scaleRange: MinMax;
  public rotationRange: MinMax; // In radians
  public rotationSpeedRange: MinMax;
  public lifetimeSecondsRange: MinMax;
  public lifetimeScaleReduction: number; // The particle scale at the end of its lifetime will be scale * lifetimeScaleReduction
  public height: number;
  public width: number;
  public emitDurationSeconds: number; // How long the emitter will emit particles
  public currentEmitDuration: number;
  public emitCount: number;
  public amountToEmit: number;
  public startEmitting: boolean;
  public currentlyEmitting: boolean;

  constructor(
    sprite: Sprite,
    renderLayer: ForgeRenderLayer,
    options: Partial<ParticleEmitterOptions> = {},
  ) {
    const {
      numParticlesRange,
      speedRange,
      scaleRange,
      rotationRange,
      rotationSpeedRange,
      lifetimeSecondsRange,
      lifetimeScaleReduction,
      height,
      width,
      emitDurationSeconds,
      positionX,
      positionY,
    } = {
      ...defaultOptions,
      ...options,
    };
    this.sprite = sprite;
    this.renderLayer = renderLayer;
    this.numParticlesRange = numParticlesRange;
    this.speedRange = speedRange;
    this.scaleRange = scaleRange;
    this.rotationRange = rotationRange;
    this.rotationSpeedRange = rotationSpeedRange;
    this.lifetimeSecondsRange = lifetimeSecondsRange;
    this.lifetimeScaleReduction = lifetimeScaleReduction;
    this.height = height;
    this.width = width;
    this.emitDurationSeconds = emitDurationSeconds;
    this.positionX = positionX;
    this.positionY = positionY;
    this.currentEmitDuration = 0;
    this.emitCount = 0;
    this.amountToEmit = 0;
    this.startEmitting = false;
    this.currentlyEmitting = false;
  }

  public setOptions(options: Partial<ParticleEmitterOptions>): void {
    const {
      numParticlesRange,
      speedRange,
      scaleRange,
      rotationRange,
      rotationSpeedRange,
      lifetimeSecondsRange,
      lifetimeScaleReduction,
      height,
      width,
      emitDurationSeconds: emitDurationSeconds,
      positionX,
      positionY,
    } = {
      ...this,
      ...options,
    };

    this.numParticlesRange = numParticlesRange;
    this.speedRange = speedRange;
    this.scaleRange = scaleRange;
    this.rotationRange = rotationRange;
    this.rotationSpeedRange = rotationSpeedRange;
    this.lifetimeSecondsRange = lifetimeSecondsRange;
    this.lifetimeScaleReduction = lifetimeScaleReduction;
    this.height = height;
    this.width = width;
    this.emitDurationSeconds = emitDurationSeconds;
    this.positionX = positionX;
    this.positionY = positionY;
  }

  public emitIfNotEmitting(): void {
    if (!this.currentlyEmitting) {
      this.startEmitting = true;
    }
  }

  public emit(): void {
    this.startEmitting = true;
  }
}
