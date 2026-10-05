import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPostProcessComponent,
  ForgeShaderSource,
  Material,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { addGlitchComponent } from './_glitch.component';
import { glitchShader } from './_glitch.shader';
import { vignetteShader } from './_vignette.shader';

/**
 * Gives `camera` two post-processing passes: a glitch that tears its image
 * in bursts, then a vignette with scanlines over the glitched result.
 */
export function addPostProcessing(
  world: EcsWorld,
  renderContext: RenderContext,
  camera: number,
): void {
  const { gl, shaderCache } = renderContext;

  shaderCache.addShader(new ForgeShaderSource(glitchShader));
  shaderCache.addShader(new ForgeShaderSource(vignetteShader));

  // Every pass is a full-screen material: the engine's passthrough vertex
  // shader with a fragment shader that samples `u_texture`.
  const vertexShader = shaderCache.getShader('passthrough.vert');

  const glitch = new Material(
    vertexShader,
    shaderCache.getShader('glitch.frag'),
    gl,
  );
  const vignette = new Material(
    vertexShader,
    shaderCache.getShader('vignette.frag'),
    gl,
  );

  glitch.setUniform('u_intensity', 0);
  glitch.setUniform('u_seed', 0);
  vignette.setUniform('u_scanlineCount', 160);

  addPostProcessComponent(world, camera, { materials: [glitch, vignette] });
  addGlitchComponent(world, camera, glitch);
}
