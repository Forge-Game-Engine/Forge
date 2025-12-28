import { Component } from '../../ecs/index.js';
import { ParticleEmitter } from './particle-emitter.js';

/**
 * Represents a component responsible for managing particle emitters in a system.
 * One particle emitter component can hold many particle emitters
 */
export class ParticleEmitterComponent extends Component {
  public emitters: Map<string, ParticleEmitter>;

  /**
   * Creates a new instance of the ParticleEmitterComponent.
   * @param emitters - A map of particle emitters, with keys used to identify each emitter.
   */
  constructor(emitters: Map<string, ParticleEmitter>) {
    super();

    this.emitters = emitters;
  }
}
