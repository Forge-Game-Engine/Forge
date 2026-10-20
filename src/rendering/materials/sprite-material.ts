import type { RenderContext } from '../render-context.js';
import type { Texture } from '../texture.js';
import { Material } from './material.js';
import { includesShader, maskShaderIncludeName } from './shader-includes.js';
import { UniformValue } from './uniform-value.js';

/** The sampler a sprite's `texture` is bound to. */
export const spriteTextureUniformName = 'u_texture';

/** The sampler a sprite's emissive map is bound to. */
export const spriteEmissiveTextureUniformName = 'u_emissiveTexture';

/**
 * The `vec2` `sprite.vert` insets each sprite's sampled rect by, in UV: half
 * a texel of the sprite's texture when its `wrap` is `'clamp'`, and zero
 * when it's `'repeat'`.
 */
export const spriteRegionInsetUniformName = 'u_regionInset';

/** What sets each uniform the render system owns, for error messages. */
const reservedUniformSources: ReadonlyMap<string, string> = new Map([
  [spriteTextureUniformName, "each sprite's `texture`"],
  [spriteEmissiveTextureUniformName, "each sprite's `emissive` map"],
  [
    spriteRegionInsetUniformName,
    "the size and `wrap` of each sprite's texture",
  ],
]);

/**
 * How far, in UV, a sprite samples inside its region of `texture`: half a
 * texel for a texture whose `wrap` is `'clamp'`, so linear filtering never
 * blends in the texels next to the region (a neighboring frame in a sheet),
 * the way it never reaches past a whole clamped texture's edges. A
 * repeating texture isn't inset, so a region that tiles or scrolls it still
 * wraps around.
 * @param texture - The sprites' texture.
 * @returns The inset, in UV, as `(x, y)`.
 */
function computeRegionInset(texture: Texture): Float32Array {
  if (
    texture.wrap === 'repeat' ||
    texture.width === 0 ||
    texture.height === 0
  ) {
    return new Float32Array([0, 0]);
  }

  return new Float32Array([0.5 / texture.width, 0.5 / texture.height]);
}

/**
 * A material that draws sprites: `sprite.vert`, which positions each
 * sprite's quad from its instance data, paired with a fragment shader. Give
 * one to `SpriteEcsComponent.material` to draw a sprite with a custom
 * fragment shader; sprites without one use `renderContext.spriteMaterial`.
 *
 * The render system binds each sprite's `texture` to `u_texture` and its
 * emissive map (or `renderContext.blackTexture`) to `u_emissiveTexture`,
 * if the fragment shader declares them, so sprites with different textures
 * share one material. It also sets `u_regionInset` from the texture, which
 * `sprite.vert` uses to compute `v_texBounds`. Those three uniforms can't
 * be set on the material.
 *
 * The fragment shader must include `mask`
 * (`#pragma forge include(mask)`) and multiply its output alpha by
 * `maskCoverage()`, so the sprite is clipped by the masks above it
 * (see `MaskEcsComponent`).
 */
export class SpriteMaterial extends Material {
  private readonly _declaresTexture: boolean;
  private readonly _declaresEmissiveTexture: boolean;

  /**
   * Constructs a new instance of the `SpriteMaterial` class.
   * @param renderContext - The render context to draw with.
   * @param fragmentShaderName - The name of the fragment shader in
   * `renderContext.shaderCache`, from its `#pragma forge name(...)`.
   * @throws An error under the same conditions as `Material`'s constructor,
   * if the shader cache has no shader called `fragmentShaderName`, or if
   * that shader doesn't include `mask`.
   */
  constructor(renderContext: RenderContext, fragmentShaderName: string) {
    const { shaderCache } = renderContext;
    const fragmentShader = shaderCache.getShader(fragmentShaderName);

    if (!includesShader(fragmentShader.preparedSource, maskShaderIncludeName)) {
      throw new Error(
        `Sprite fragment shader "${fragmentShaderName}" must include "${maskShaderIncludeName}" (#pragma forge include(${maskShaderIncludeName})) and multiply its output alpha by maskCoverage(), so masks clip the sprites it draws.`,
      );
    }

    super(renderContext, shaderCache.getShader('sprite.vert'), fragmentShader);

    this._declaresTexture = this.hasUniform(spriteTextureUniformName);
    this._declaresEmissiveTexture = this.hasUniform(
      spriteEmissiveTextureUniformName,
    );
  }

  /**
   * Sets a uniform's value, as {@link Material.setUniform} does.
   * @param name - The uniform's name.
   * @param value - The value to upload.
   * @throws An error for `u_texture`, `u_emissiveTexture` and
   * `u_regionInset`, which the render system sets from each sprite, and
   * under the same conditions as {@link Material.setUniform}.
   */
  public override setUniform(name: string, value: UniformValue): void {
    const source = reservedUniformSources.get(name);

    if (source !== undefined) {
      throw new Error(
        `Uniform "${name}" of a sprite material is set by the render system from ${source}; change the sprite instead.`,
      );
    }

    super.setUniform(name, value);
  }

  /**
   * Binds the material to draw sprites with `texture` and `emissiveTexture`.
   * Called by the render system for each batch.
   * @param gl - The WebGL2 rendering context.
   * @param texture - The sprites' texture, bound to `u_texture`. Its size
   * and `wrap` set `u_regionInset`.
   * @param emissiveTexture - The sprites' emissive map, bound to
   * `u_emissiveTexture`.
   * @returns The first texture unit the material left free.
   */
  public bindSprites(
    gl: WebGL2RenderingContext,
    texture: Texture,
    emissiveTexture: Texture,
  ): number {
    this.storeUniform(
      spriteRegionInsetUniformName,
      computeRegionInset(texture),
    );

    if (this._declaresTexture) {
      this.storeUniform(spriteTextureUniformName, texture);
    }

    if (this._declaresEmissiveTexture) {
      this.storeUniform(spriteEmissiveTextureUniformName, emissiveTexture);
    }

    return this.bind(gl);
  }
}

/**
 * Creates a material that draws sprites with a custom fragment shader,
 * paired with `sprite.vert`. The shader receives `v_texCoord` (the sprite's
 * frame UVs), `flat in highp vec4 v_texBounds` (the rect to clamp
 * `v_texCoord` to before sampling, min in `xy` and max in `zw`), `v_tint`
 * (its tint, with `opacityMultiplier` in alpha) and `v_emissive` (its
 * emissive color), and can declare `u_texture` and `u_emissiveTexture` to
 * sample the sprite's texture and emissive map. Sampling them at
 * `clamp(v_texCoord, v_texBounds.xy, v_texBounds.zw)` keeps linear
 * filtering from blending in the texels around the sprite's region of a
 * sheet. It must include `mask` and multiply its output alpha by
 * `maskCoverage()`. Declare and set any other uniforms it needs on
 * the returned material.
 * @param renderContext - The render context to draw with.
 * @param fragmentShaderName - The name of the fragment shader, registered
 * in `renderContext.shaderCache`.
 * @returns The material. Materials from the same shader share one program.
 * @throws An error if the fragment shader doesn't include `mask`, and
 * under the same conditions as `SpriteMaterial`'s constructor.
 */
export function createSpriteMaterial(
  renderContext: RenderContext,
  fragmentShaderName: string,
): SpriteMaterial {
  return new SpriteMaterial(renderContext, fragmentShaderName);
}
