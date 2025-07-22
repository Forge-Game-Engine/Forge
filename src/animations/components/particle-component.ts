import type { Component } from '../../ecs';

export interface ParticleOptions {
  speed: number;
  originalScale: number;
  scaleChangeFactor: number;
  height: number;
  width: number;
  rotation: number;
  rotationSpeed: number;
  lifetimeSeconds: number;
}

export class ParticleComponent implements Component {
  public name: symbol;
  public positionX: number;
  public positionY: number;
  public speed: number;
  public originalScale: number;
  public scale: number;
  public scaleChangeFactor: number;
  public height: number;
  public width: number;
  public rotation: number;
  public rotationSpeed: number;
  public ageSeconds: number = 0;
  public lifetimeSeconds: number;

  public static readonly symbol = Symbol('Particle');

  constructor(positionX: number, positionY: number, options: ParticleOptions) {
    const {
      speed,
      originalScale,
      scaleChangeFactor,
      height,
      width,
      rotation,
      rotationSpeed,
      lifetimeSeconds,
    } = {
      ...options,
    };
    this.name = ParticleComponent.symbol;
    this.positionX = positionX;
    this.positionY = positionY;
    this.speed = speed;
    this.originalScale = originalScale;
    this.scale = originalScale;
    this.scaleChangeFactor = scaleChangeFactor;
    this.height = height;
    this.width = width;
    this.rotation = rotation;
    this.rotationSpeed = rotationSpeed;
    this.lifetimeSeconds = lifetimeSeconds;
  }

  public update(deltaTimeInSeconds: number): void {
    this.ageSeconds += deltaTimeInSeconds; // Convert milliseconds to seconds
    this.positionX += this.speed * deltaTimeInSeconds * Math.sin(this.rotation); // Update position based on speed
    this.positionY -= this.speed * deltaTimeInSeconds * Math.cos(this.rotation); // Update position based on speed
    this.scale =
      this.originalScale * (1 - this.ageSeconds / this.lifetimeSeconds) +
      this.scaleChangeFactor * (this.ageSeconds / this.lifetimeSeconds); // Update scale based on age
    this.rotation += this.rotationSpeed * deltaTimeInSeconds; // Update rotation
  }
}
