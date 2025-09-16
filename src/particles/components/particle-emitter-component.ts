import type { Component } from '../../ecs';
import { ParticleEmitter } from './particle-emitter';

/**
 * Represents a component responsible for managing particle emitters in a system.
 * One particle emitter component can hold many particle emitters
 */
export class ParticleEmitterComponent implements Component {
  public name: symbol;
  public emitters: Map<string, ParticleEmitter>;

  public static readonly symbol = Symbol('ParticleEmitter');

  /**
   * Creates a new instance of the ParticleEmitterComponent.
   * @param emitters - A map of particle emitters, with keys used to identify each emitter.
   */
  constructor(emitters: Map<string, ParticleEmitter>) {
    this.name = ParticleEmitterComponent.symbol;
    this.emitters = emitters;
  }
}
