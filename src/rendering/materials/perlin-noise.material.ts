import type { Time } from '../../common';
import type { Vector2 } from '../../math';
import type { ShaderStore } from '../shaders';
import { Material } from './material';

export class PerlinNoiseMaterial extends Material {
  private readonly _time: Time;

  constructor(
    gl: WebGL2RenderingContext,
    shaderStore: ShaderStore,
    resolution: Vector2,
    time: Time,
  ) {
    super('sprite.vert', 'perlinNoise.frag', shaderStore, gl);

    this.setUniform(
      'u_resolution',
      new Float32Array([resolution.x, resolution.y]),
    );

    this.setUniform('u_time', time.timeInSeconds);

    this._time = time;
  }

  protected override beforeBind(): void {
    this.setUniform('u_time', this._time.timeInSeconds);
  }
}
