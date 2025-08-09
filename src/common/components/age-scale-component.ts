import type { Component } from '../../ecs';

/**
 * Component to track an entity with age's scale change over its lifetime
 */
export class AgeScaleComponent implements Component {
  public name: symbol;
  public originalScale: number;
  public lifetimeScaleReduction: number;
  public static readonly symbol = Symbol('AgeScale');

  /**
   * Creates an instance of the AgeScaleComponent.
   * @param originalScale - The original scale of the entity.
   * @param lifetimeScaleReduction - The reduction in scale of the entity over its lifetime.
   * The entities final scale will equal to originalScale * lifetimeScaleReduction.
   */
  constructor(originalScale: number, lifetimeScaleReduction: number) {
    this.name = AgeScaleComponent.symbol;
    this.originalScale = originalScale;
    this.lifetimeScaleReduction = lifetimeScaleReduction;
  }
}
