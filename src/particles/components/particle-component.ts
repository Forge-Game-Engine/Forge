import { Component } from '../../ecs/index.js';

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
export class ParticleComponent extends Component {
  public rotationSpeed: number;

  /**
   * Creates an instance of ParticleComponent.
   * @param options - The configuration options for the particle component.
   */
  constructor(options: ParticleOptions) {
    super();

    const { rotationSpeed } = options;

    this.rotationSpeed = rotationSpeed;
  }
}
