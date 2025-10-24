import type { Component } from '../../ecs/index.js';

/**
 * Component to track how an entity's scale changes with age over its lifetime
 */
export class AgeScaleComponent implements Component {
  public name: symbol;
  public originalScaleX: number;
  public originalScaleY: number;
  public finalLifetimeScaleX: number;
  public finalLifetimeScaleY: number;
  public static readonly symbol = Symbol('AgeScale');

  /**
   * Creates an instance of the AgeScaleComponent.
   * @param originalScaleX - The original x scale of the entity.
   * @param originalScaleY - The original y scale of the entity.
   * @param finalLifetimeScaleX - The final x scale the entity will have at the end of its lifetime
   * @param finalLifetimeScaleY - The final y scale the entity will have at the end of its lifetime
   */
  constructor(
    originalScaleX: number,
    originalScaleY: number,
    finalLifetimeScaleX: number,
    finalLifetimeScaleY: number,
  ) {
    this.name = AgeScaleComponent.symbol;
    this.originalScaleX = originalScaleX;
    this.originalScaleY = originalScaleY;
    this.finalLifetimeScaleX = finalLifetimeScaleX;
    this.finalLifetimeScaleY = finalLifetimeScaleY;
  }
}
