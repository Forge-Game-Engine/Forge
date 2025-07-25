import type { Component } from '../../ecs';

export interface ParticleOptions {
  speed: number;
  originalScale: number;
  lifetimeScaleReduction: number;
  height: number;
  width: number;
  rotation: number;
  rotationSpeed: number;
  lifetimeSeconds: number;
  positionX: number;
  positionY: number;
}

export class ParticleComponent implements Component {
  public name: symbol;
  public speed: number;
  public originalScale: number;
  public scale: number;
  public lifetimeScaleReduction: number;
  public height: number;
  public width: number;
  public rotation: number;
  public rotationSpeed: number;
  public ageSeconds: number = 0;
  public lifetimeSeconds: number;
  public positionX: number;
  public positionY: number;

  public static readonly symbol = Symbol('Particle');

  constructor(options: ParticleOptions) {
    const {
      speed,
      originalScale,
      lifetimeScaleReduction,
      height,
      width,
      rotation,
      rotationSpeed,
      lifetimeSeconds,
      positionX,
      positionY,
    } = {
      ...options,
    };
    this.name = ParticleComponent.symbol;
    this.speed = speed;
    this.originalScale = originalScale;
    this.scale = originalScale;
    this.lifetimeScaleReduction = lifetimeScaleReduction;
    this.height = height;
    this.width = width;
    this.rotation = rotation;
    this.rotationSpeed = rotationSpeed;
    this.lifetimeSeconds = lifetimeSeconds;
    this.positionX = positionX;
    this.positionY = positionY;
  }

  public update(deltaTimeInSeconds: number): void {
    this.ageSeconds += deltaTimeInSeconds;
    this.positionX += this.speed * deltaTimeInSeconds * Math.sin(this.rotation);
    this.positionY -= this.speed * deltaTimeInSeconds * Math.cos(this.rotation);
    this.scale =
      this.originalScale * (1 - this.ageSeconds / this.lifetimeSeconds) +
      this.lifetimeScaleReduction * (this.ageSeconds / this.lifetimeSeconds);
    this.rotation += this.rotationSpeed * deltaTimeInSeconds;
  }
}
