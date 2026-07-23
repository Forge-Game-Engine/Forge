import {
  Color,
  createQuadGeometry,
  Renderable,
  SpriteEcsComponent,
  Vector2,
} from '../../index.js';
import { Material } from '../materials/index.js';
import { NineSliceOptions } from '../nine-slice-options.js';
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
   * The emissive map image.
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

export interface CreateImageSpriteOptions {
  /**
   * The dimensions of a single frame in the image, for sprite sheets. Defaults to the full image size (i.e. a single-frame sprite).
   */
  frameDimensions?: Vector2;

  /**
   * The emissive map to add on top of the sprite's tinted albedo, unaffected
   * by lighting. Omit for a sprite with no emissive contribution.
   */
  emissiveMap?: EmissiveMapOptions;

  /**
   * Samples the sprite's texture (and its emissive map, if any) with nearest-
   * neighbor filtering for crisp, blocky scaling, appropriate for pixel-art
   * assets. Defaults to `false`, which uses linear filtering so the sprite's
   * own anti-aliased edges (for example a soft-edged circle) are preserved
   * instead of being sampled into a hard, staggered stair-step.
   */
  pixelated?: boolean;

  /**
   * Nine-slice configuration, for a sprite whose corners should stay a
   * fixed size while its edges/center stretch or tile. Omit for a normal,
   * single-quad sprite.
   */
  slices?: NineSliceOptions;
}

// `color` isn't included here: `Color.white` can't be read at module-init
// time (this file sits in a circular import cycle through `../../index.js`,
// so `Color`'s static fields aren't guaranteed to be initialized yet when
// this module's own top-level code runs). Defaulting it inside
// `createImageSprite`'s body instead defers that read until the function is
// actually called, well after every module has finished loading.
const defaultEmissiveMapOptions = { intensity: 1 };

const defaultCreateImageSpriteOptions = { pixelated: false };

/**
 * Creates a sprite using the provided image and render layer.
 * @param image - The image to use for the sprite.
 * @param renderContext - The render context to be used.
 * @param layer - The render layer for the sprite.
 * @param options - Optional parameters for creating the sprite.
 * @returns The created sprite.
 */
export function createImageSprite(
  image: HTMLImageElement,
  renderContext: RenderContext,
  layer: number,
  options: CreateImageSpriteOptions = {},
): SpriteEcsComponent {
  const { shaderCache, gl } = renderContext;
  const { pixelated } = { ...defaultCreateImageSpriteOptions, ...options };

  const spriteVertexShader = shaderCache.getShader('sprite.vert');
  const spriteFragmentShader = shaderCache.getShader('sprite.frag');

  const material = new Material(spriteVertexShader, spriteFragmentShader, gl);

  material.setUniform(
    'u_texture',
    createTextureFromImage(gl, image, pixelated),
  );

  const resolvedEmissive = options.emissiveMap
    ? { ...defaultEmissiveMapOptions, ...options.emissiveMap }
    : undefined;

  material.setUniform(
    'u_emissiveTexture',
    resolvedEmissive
      ? createTextureFromImage(gl, resolvedEmissive.image, pixelated)
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
    width: options.frameDimensions?.x ?? image.width,
    height: options.frameDimensions?.y ?? image.height,
    pivot: new Vector2(0.5, 0.5),
    tintColor: Color.white,
    renderable,
    uvOffset: new Vector2(0, 0),
    uvScale: new Vector2(1, 1),
    layer: 0,
    slices: options.slices,
  };
}
