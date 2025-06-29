import { ViewModelInstance } from '@rive-app/webgl2';
import { ModelProperty, NumberModelProperty } from '../../src';

export class FPSModel {
  public readonly fps: NumberModelProperty;

  constructor(model: ViewModelInstance) {
    this.fps = new ModelProperty(model.number('fps_value'));
  }
}
