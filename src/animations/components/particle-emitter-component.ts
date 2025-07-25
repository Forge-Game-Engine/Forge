import type { Component } from '../../ecs';
import { ForgeRenderLayer, Renderable } from '../../rendering';
import { ParticleComponent } from './particle-component';

export interface ParticleEmitterOptions {
  minNumParticles: number;
  maxNumParticles: number;
  minSpeed: number;
  maxSpeed: number;
  minScale: number;
  maxScale: number;
  lifetimeScaleReduction: number;
  height: number;
  width: number;
  minRotation: number;
  maxRotation: number;
  minRotationSpeed: number;
  maxRotationSpeed: number;
  minLifetime: number;
  maxLifetime: number;
  emitDuration: number;
}

const defaultOptions: ParticleEmitterOptions = {
  minNumParticles: 5,
  maxNumParticles: 10,
  minSpeed: 10,
  maxSpeed: 20,
  minScale: 1,
  maxScale: 1,
  lifetimeScaleReduction: 0,
  height: 10,
  width: 10,
  minRotation: 0,
  maxRotation: 360,
  minRotationSpeed: 0,
  maxRotationSpeed: 0,
  minLifetime: 1,
  maxLifetime: 3,
  emitDuration: 0,
};
export class ParticleEmitterComponent implements Component {
  public name: symbol;
  public renderable: Renderable;
  public renderLayer: ForgeRenderLayer;
  public positionX: number = 0;
  public positionY: number = 0;
  public particles: ParticleComponent[] = [];
  public minNumParticles: number;
  public maxNumParticles: number;
  public minSpeed: number;
  public maxSpeed: number;
  public minScale: number;
  public maxScale: number;
  public lifetimeScaleReduction: number; // The final particle scale will be scale * lifetimeScaleReduction
  public height: number;
  public width: number;
  public minRotation: number; // In radians
  public maxRotation: number;
  public minRotationSpeed: number;
  public maxRotationSpeed: number;
  public minLifetime: number;
  public maxLifetime: number;
  public emitDuration: number; // How long the emitter will emit particles
  public emitStartTime: number = 0;
  public emitCount: number = 0;
  public amountToEmit: number = 0;
  public startEmitting: boolean = true;
  public currentlyEmitting: boolean = false;

  public static readonly symbol = Symbol('ParticleEmitter');

  constructor(
    renderable: Renderable,
    renderLayer: ForgeRenderLayer,
    options: Partial<ParticleEmitterOptions> = {},
  ) {
    const {
      minNumParticles,
      maxNumParticles,
      minSpeed,
      maxSpeed,
      minScale: minScale,
      maxScale: maxScale,
      lifetimeScaleReduction,

      height,
      width,
      minRotation,
      maxRotation,
      minRotationSpeed,
      maxRotationSpeed,
      minLifetime,
      maxLifetime,
      emitDuration,
    } = {
      ...defaultOptions,
      ...options,
    };
    this.name = ParticleEmitterComponent.symbol;
    this.renderable = renderable;
    this.renderLayer = renderLayer;
    this.minNumParticles = minNumParticles;
    this.maxNumParticles = maxNumParticles;
    this.minSpeed = minSpeed;
    this.maxSpeed = maxSpeed;
    this.minScale = minScale;
    this.maxScale = maxScale;
    this.lifetimeScaleReduction = lifetimeScaleReduction;
    this.height = height;
    this.width = width;
    this.minRotation = minRotation;
    this.maxRotation = maxRotation;
    this.minRotationSpeed = minRotationSpeed;
    this.maxRotationSpeed = maxRotationSpeed;
    this.minLifetime = minLifetime;
    this.maxLifetime = maxLifetime;
    this.emitDuration = emitDuration;
  }

  public setOptions(options: Partial<ParticleEmitterOptions>): void {
    const {
      minNumParticles,
      maxNumParticles,
      minSpeed,
      maxSpeed,
      minScale: minScale,
      maxScale: maxScale,
      lifetimeScaleReduction,

      height,
      width,
      minRotation,
      maxRotation,
      minRotationSpeed,
      maxRotationSpeed,
      minLifetime,
      maxLifetime,
      emitDuration,
    } = {
      ...this,
      ...options,
    };

    this.minNumParticles = minNumParticles;
    this.maxNumParticles = maxNumParticles;
    this.minSpeed = minSpeed;
    this.maxSpeed = maxSpeed;
    this.minScale = minScale;
    this.maxScale = maxScale;
    this.lifetimeScaleReduction = lifetimeScaleReduction;
    this.height = height;
    this.width = width;
    this.minRotation = minRotation;
    this.maxRotation = maxRotation;
    this.minRotationSpeed = minRotationSpeed;
    this.maxRotationSpeed = maxRotationSpeed;
    this.minLifetime = minLifetime;
    this.maxLifetime = maxLifetime;
    this.emitDuration = emitDuration;
  }

  // Only emits if not already emitting
  public emit(positionX: number, positionY: number): void {
    this.positionX = positionX;
    this.positionY = positionY;

    if (!this.currentlyEmitting) {
      this.startEmitting = true;
    }
  }
}
