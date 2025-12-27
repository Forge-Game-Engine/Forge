import type { Time } from '../../common/index.js';
import type { Vector2 } from '../../math/index.js';
import { Material } from './material.js';

export class PerlinNoiseMaterial extends Material {
  constructor(
    gl: WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string,
    resolution: Vector2,
    time: Time,
  ) {
    super(vertexShaderSource, fragmentShaderSource, gl);

    this.setUniform(
      'u_resolution',
      new Float32Array([resolution.x, resolution.y]),
    );

    this.setUniform('u_time', time.timeInSeconds);
  }
}
