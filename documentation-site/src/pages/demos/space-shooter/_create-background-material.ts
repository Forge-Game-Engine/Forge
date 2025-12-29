import {
  Color,
  Material,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { backgroundShader } from './_background.shader';

export function createBackgroundMaterial(
  renderContext: RenderContext,
): Material {
  renderContext.shaderCache.addShader(backgroundShader);

  const vertexShader = renderContext.shaderCache.getShader('sprite.vert');
  const fragmentShader = renderContext.shaderCache.getShader('background.frag');

  const backgroundMaterial = new Material(
    vertexShader,
    fragmentShader,
    renderContext.gl,
  );

  backgroundMaterial.setUniform(
    'u_resolution',
    new Float32Array([renderContext.canvas.width, renderContext.canvas.height]),
  );

  backgroundMaterial.setUniform(
    'u_color',
    new Color(0.6, 1, 0.7, 0.7).toFloat32Array(),
  );

  return backgroundMaterial;
}
