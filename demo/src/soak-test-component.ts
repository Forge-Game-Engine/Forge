import { Component } from '../../src';

export interface SoakTestSample {
  entityCount: number;
  fps: number;
}

/**
 * Tracks the progress and recorded samples of a soak test.
 */
export class SoakTestComponent implements Component {
  public name: symbol;
  public readonly samples: SoakTestSample[] = [];
  public nextStepAtMilliseconds: number = 0;
  public isComplete: boolean = false;

  public static readonly symbol = Symbol('SoakTest');

  constructor() {
    this.name = SoakTestComponent.symbol;
  }
}
