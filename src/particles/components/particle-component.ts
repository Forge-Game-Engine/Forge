import type { Component } from 'forge/ecs';

/**
 * Represents the properties of a particle.
 */
export interface ParticleOptions {
  /**
   * The speed at which the particle rotates.
   */
  rotationSpeed: number;
}

/**
 * Represents a particle component.
 * This class is used to define properties and behavior for particles, such as their rotation speed.
 */
export class ParticleComponent implements Component {
  public name: symbol;
  public rotationSpeed: number;

  public static readonly symbol = Symbol('Particle');

  /**
   * Creates an instance of ParticleComponent.
   * @param options - The configuration options for the particle component.
   */
  constructor(options: ParticleOptions) {
    const { rotationSpeed } = options;
    this.name = ParticleComponent.symbol;

    this.rotationSpeed = rotationSpeed;
  }
}
