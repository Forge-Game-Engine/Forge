import {
  Color,
  createQuadGeometry,
  Renderable,
  SpriteEcsComponent,
  Vector2,
} from '../../index.js';
import { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import {
  createTextureFromImage,
  getSharedBlackTexture,
} from '../shaders/index.js';
import { combineInstanceDataSegments } from './instance-data-segment.js';
import { spriteInstanceDataSegment } from './sprite-instance-data-segment.js';

/**
 * Configures an emissive map for `createImageSprite`: a texture, sampled
 * against the sprite's own UVs, that's added on top of the tinted albedo
 * unaffected by lighting.
 */
export interface EmissiveMapOptions {
  /**
   * The emissive map image. Only its RGB channels are used; alpha is
   * ignored, matching how emissive maps work in glTF/Unity/Unreal/three.js
   * - a sprite's opacity always comes from its base texture's alpha alone,
   * so emissive can't make an otherwise-transparent pixel visible. Author
   * this (and the base texture) with solid, reasonably opaque edges rather
   * than a soft low-alpha gradient faking a glow: alpha blending crushes
   * low-alpha pixels regardless of how bright their color is, so a
   * hand-painted fade reads as nearly invisible, whereas an opaque shape
   * lets `createBloomEcsSystem`'s blur produce the soft glow instead.
   *
   * Paint this as a plain **greyscale** intensity mask (equal R/G/B) rather
   * than baking a color into it, and set that color separately via `color`.
   * A greyscale mask keeps brightness uniform across the emitting shape, so
   * raising `BloomEcsComponent.threshold` cleanly includes or excludes the
   * whole shape as a unit - exactly what you want if, say, only this sprite
   * (and not others without an emissive map) should ever bloom. A map with
   * color and brightness baked together varies non-uniformly per channel,
   * which makes threshold behave unpredictably (parts of the shape drop out
   * before others as you raise it).
   */
  image: HTMLImageElement;

  /**
   * Tints the emissive map, so a plain greyscale mask can still glow any
   * color. Multiplied against the emissive map's sampled RGB, before
   * `intensity` scales the result. Defaults to `Color.white` (no tint,
   * i.e. the mask's own greyscale value is used as-is).
   */
  color?: Color;

  /**
   * Multiplies the sampled (and tinted) emissive color before it's added on
   * top of the tinted albedo. Values above `1` push a pixel's brightness
   * into HDR range, for `createBloomEcsSystem` (on an HDR-format render
   * target, see `RENDER_TARGET_FORMAT`) to bloom convincingly even where
   * the sprite's own albedo isn't pure white. Defaults to `1`.
   */
  intensity?: number;
}

// `color` isn't included here: `Color.white` can't be read at module-init
// time (this file sits in a circular import cycle through `../../index.js`,
// so `Color`'s static fields aren't guaranteed to be initialized yet when
// this module's own top-level code runs). Defaulting it inside
// `createImageSprite`'s body instead defers that read until the function is
// actually called, well after every module has finished loading.
const defaultEmissiveMapOptions = { intensity: 1 };

/**
 * Creates a sprite using the provided image and render layer.
 * @param image - The image to use for the sprite.
 * @param renderContext - The render context to be used.
 * @param layer - The render layer for the sprite.
 * @param frameDimensions - The dimensions of a single frame in the image (for sprite sheets).
 * @param emissiveMapOptions - An emissive map to add on top of the sprite's tinted albedo, unaffected by lighting. Omit for a sprite with no emissive contribution.
 * @returns The created sprite.
 */
export function createImageSprite(
  image: HTMLImageElement,
  renderContext: RenderContext,
  layer: number,
  frameDimensions: Vector2 = new Vector2(image.width, image.height),
  emissiveMapOptions?: EmissiveMapOptions,
): SpriteEcsComponent {
  const { shaderCache, gl } = renderContext;

  const spriteVertexShader = shaderCache.getShader('sprite.vert');
  const spriteFragmentShader = shaderCache.getShader('sprite.frag');

  const material = new Material(spriteVertexShader, spriteFragmentShader, gl);

  material.setUniform('u_texture', createTextureFromImage(gl, image, true));

  const resolvedEmissive = emissiveMapOptions
    ? { ...defaultEmissiveMapOptions, ...emissiveMapOptions }
    : undefined;

  material.setUniform(
    'u_emissiveTexture',
    resolvedEmissive
      ? createTextureFromImage(gl, resolvedEmissive.image, true)
      : getSharedBlackTexture(gl),
  );
  material.setColorUniform(
    'u_emissiveColor',
    resolvedEmissive?.color ?? Color.white,
  );
  material.setUniform(
    'u_emissiveIntensity',
    resolvedEmissive ? resolvedEmissive.intensity : 0,
  );

  const { floatsPerInstance, bindInstanceData, setupInstanceAttributes } =
    combineInstanceDataSegments(spriteInstanceDataSegment);

  const renderable = new Renderable(
    createQuadGeometry(gl),
    material,
    floatsPerInstance,
    layer,
    bindInstanceData,
    setupInstanceAttributes,
  );

  return {
    enabled: true,
    width: frameDimensions.x,
    height: frameDimensions.y,
    pivot: new Vector2(0.5, 0.5),
    tintColor: Color.white,
    renderable,
    uvOffset: new Vector2(0, 0),
    uvScale: new Vector2(1, 1),
    layer: 0,
  };
}
