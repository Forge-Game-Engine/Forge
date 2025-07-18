import type { Component } from '../../ecs';

//TODO: 'repeating' is currently ignored. Find a way to have one-time animations
export interface ImageAnimatedProperties {
  geometryTexCoords: Float32Array[];
  animationDurationSeconds: number;
  repeating: boolean;
  context: WebGL2RenderingContext;
}

export class ImageAnimationComponent implements Component {
  public name: symbol;
  public geometryTexCoords: Float32Array[];
  public repeating: boolean;
  public frameTime: number = 0;
  public animationIndex: number = 0;
  public frameLengthInSeconds: number;
  public numFrames: number;
  public context: WebGL2RenderingContext;

  public static readonly symbol = Symbol('ImageAnimation');

  constructor(options: ImageAnimatedProperties) {
    const { geometryTexCoords, animationDurationSeconds, repeating, context } =
      options;
    this.name = ImageAnimationComponent.symbol;
    this.geometryTexCoords = geometryTexCoords;
    this.repeating = repeating;

    this.numFrames = geometryTexCoords.length;
    this.frameLengthInSeconds = animationDurationSeconds / this.numFrames;
    this.context = context;
  }
}
