import type { Component } from '../../ecs';

export interface ParticleOptions {
  speed: number;
  originalScale: number;
  lifetimeScaleReduction: number;
  rotationSpeed: number;
}

export class ParticleComponent implements Component {
  public name: symbol;
  public speed: number;
  public originalScale: number;
  public lifetimeScaleReduction: number;
  public rotationSpeed: number;

  public static readonly symbol = Symbol('Particle');

  constructor(options: ParticleOptions) {
    const { speed, originalScale, lifetimeScaleReduction, rotationSpeed } =
      options;
    this.name = ParticleComponent.symbol;
    this.speed = speed;
    this.originalScale = originalScale;
    this.lifetimeScaleReduction = lifetimeScaleReduction;
    this.rotationSpeed = rotationSpeed;
  }
}
