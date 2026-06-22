import { Component } from '../../src';

export interface CircleMotionOptions {
  centerX: number;
  centerY: number;
  radius: number;
  angularSpeed: number;
  phase: number;
}

/**
 * Component that describes circular motion around a fixed center point.
 */
export class CircleMotionComponent implements Component {
  public name: symbol;
  public centerX: number;
  public centerY: number;
  public radius: number;
  public angularSpeed: number;
  public phase: number;

  public static readonly symbol = Symbol('CircleMotion');

  constructor(options: CircleMotionOptions) {
    this.name = CircleMotionComponent.symbol;

    this.centerX = options.centerX;
    this.centerY = options.centerY;
    this.radius = options.radius;
    this.angularSpeed = options.angularSpeed;
    this.phase = options.phase;
  }
}
