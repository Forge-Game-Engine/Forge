import type { Component } from '../../ecs';
import type { Renderable } from '../../rendering';

//TODO: 'repeating' is currently ignored. Find a way to have one-time animations
export interface ImageAnimatedProperties {
  frames: Renderable[];
  animationDurationSeconds: number;
  repeating: boolean;
}

export class ImageAnimationComponent implements Component {
  public name: symbol;
  public frames: Renderable[];
  public repeating: boolean;
  public frameTime: number = 0;
  public animationIndex: number = 0;
  public frameLengthInSeconds: number;
  public numFrames: number;

  public static readonly symbol = Symbol('ImageAnimation');

  constructor(options: ImageAnimatedProperties) {
    const { frames, animationDurationSeconds, repeating } = options;
    this.name = ImageAnimationComponent.symbol;
    this.frames = frames;
    this.repeating = repeating;

    this.numFrames = frames.length;
    this.frameLengthInSeconds = animationDurationSeconds / this.numFrames;
  }
}
