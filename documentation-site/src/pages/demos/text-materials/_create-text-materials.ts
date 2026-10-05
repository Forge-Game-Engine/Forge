import {
  Color,
  ForgeShaderSource,
  Material,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { createTextMaterial } from '@forge-game-engine/forge/text';
import { dissolveShader } from './_dissolve.shader';
import { flickerShader } from './_flicker.shader';
import { shimmerShader } from './_shimmer.shader';

export interface TextMaterials {
  shimmer: Material;
  dissolve: Material;
  flicker: Material;
}

/**
 * Builds a text material from each shader. The engine binds the font's
 * atlas to them, so they only set uniforms of their own.
 */
export function createTextMaterials(
  renderContext: RenderContext,
): TextMaterials {
  const shimmer = createTextMaterial(
    renderContext,
    new ForgeShaderSource(shimmerShader),
  );
  const dissolve = createTextMaterial(
    renderContext,
    new ForgeShaderSource(dissolveShader),
  );
  const flicker = createTextMaterial(
    renderContext,
    new ForgeShaderSource(flickerShader),
  );

  shimmer.setColorUniform('u_highlightColor', new Color(1, 0.95, 0.75));
  shimmer.setUniform('u_time', 0);
  dissolve.setColorUniform('u_edgeColor', new Color(1, 0.55, 0.1));
  dissolve.setUniform('u_progress', 0);
  flicker.setUniform('u_intensity', 0);
  flicker.setUniform('u_seed', 0);

  return { shimmer, dissolve, flicker };
}
