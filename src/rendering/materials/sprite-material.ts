import type { RenderContext } from '../render-context.js';
import type { Texture } from '../texture.js';
import { Material } from './material.js';
import { UniformValue } from './uniform-value.js';

/** The sampler a sprite's `texture` is bound to. */
export const spriteTextureUniformName = 'u_texture';

/** The sampler a sprite's emissive map is bound to. */
export const spriteEmissiveTextureUniformName = 'u_emissiveTexture';

/**
 * A material that draws sprites: `sprite.vert`, which positions each
 * sprite's quad from its instance data, paired with a fragment shader. Give
 * one to `SpriteEcsComponent.material` to draw a sprite with a custom
 * fragment shader; sprites without one use `renderContext.spriteMaterial`.
 *
 * The render system binds each sprite's `texture` to `u_texture` and its
 * emissive map (or `renderContext.blackTexture`) to `u_emissiveTexture`,
 * if the fragment shader declares them, so sprites with different textures
 * share one material. Those two uniforms can't be set on the material.
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
   * or if the shader cache has no shader called `fragmentShaderName`.
   */
  constructor(renderContext: RenderContext, fragmentShaderName: string) {
    const { shaderCache } = renderContext;

    super(
      renderContext,
      shaderCache.getShader('sprite.vert'),
      shaderCache.getShader(fragmentShaderName),
    );

    this._declaresTexture = this.hasUniform(spriteTextureUniformName);
    this._declaresEmissiveTexture = this.hasUniform(
      spriteEmissiveTextureUniformName,
    );
  }

  /**
   * Sets a uniform's value, as {@link Material.setUniform} does.
   * @param name - The uniform's name.
   * @param value - The value to upload.
   * @throws An error for `u_texture` and `u_emissiveTexture`, which the
   * render system sets from each sprite, and under the same conditions as
   * {@link Material.setUniform}.
   */
  public override setUniform(name: string, value: UniformValue): void {
    if (
      name === spriteTextureUniformName ||
      name === spriteEmissiveTextureUniformName
    ) {
      throw new Error(
        `Uniform "${name}" of a sprite material is set by the render system from each sprite's ${name === spriteTextureUniformName ? '`texture`' : '`emissive` map'}; change the sprite instead.`,
      );
    }

    super.setUniform(name, value);
  }

  /**
   * Binds the material to draw sprites with `texture` and `emissiveTexture`.
   * Called by the render system for each batch.
   * @param gl - The WebGL2 rendering context.
   * @param texture - The sprites' texture, bound to `u_texture`.
   * @param emissiveTexture - The sprites' emissive map, bound to
   * `u_emissiveTexture`.
   * @returns The first texture unit the material left free.
   */
  public bindSprites(
    gl: WebGL2RenderingContext,
    texture: Texture,
    emissiveTexture: Texture,
  ): number {
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
 * frame UVs), `v_tint` (its tint, with `opacityMultiplier` in alpha) and
 * `v_emissive` (its emissive color), and can declare `u_texture` and
 * `u_emissiveTexture` to sample the sprite's texture and emissive map.
 * Declare and set any other uniforms it needs on the returned material.
 * @param renderContext - The render context to draw with.
 * @param fragmentShaderName - The name of the fragment shader, registered
 * in `renderContext.shaderCache`.
 * @returns The material. Materials from the same shader share one program.
 */
export function createSpriteMaterial(
  renderContext: RenderContext,
  fragmentShaderName: string,
): SpriteMaterial {
  return new SpriteMaterial(renderContext, fragmentShaderName);
}
