import type { Component } from '../../ecs';
import { ParticleEmitter } from './particle-emitter';

export class ParticleEmitterComponent implements Component {
  public name: symbol;
  public emitters: Map<string, ParticleEmitter>;
  public static readonly symbol = Symbol('ParticleEmitter');

  constructor(emitters: Map<string, ParticleEmitter>) {
    this.name = ParticleEmitterComponent.symbol;
    this.emitters = emitters;
  }
}
