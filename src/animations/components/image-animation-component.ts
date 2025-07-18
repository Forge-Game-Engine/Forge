import type { Component } from '../../ecs';
import type { Geometry } from '../../rendering';

//TODO: 'repeating' is currently ignored. Find a way to have one-time animations
export interface ImageAnimatedProperties {
  frameGeometry: Geometry[];
  animationDurationSeconds: number;
  repeating: boolean;
}

export class ImageAnimationComponent implements Component {
  public name: symbol;
  public frameGeometry: Geometry[];
  public repeating: boolean;
  public frameTime: number = 0;
  public animationIndex: number = 0;
  public frameLengthInSeconds: number;
  public numFrames: number;

  public static readonly symbol = Symbol('ImageAnimation');

  constructor(options: ImageAnimatedProperties) {
    const { frameGeometry, animationDurationSeconds, repeating } = options;
    this.name = ImageAnimationComponent.symbol;
    this.frameGeometry = frameGeometry;
    this.repeating = repeating;

    this.numFrames = frameGeometry.length;
    this.frameLengthInSeconds = animationDurationSeconds / this.numFrames;
  }
}
