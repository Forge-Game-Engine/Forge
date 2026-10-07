import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { Color } from '../color.js';
import {
  NineSliceOptions,
  resolveNineSliceNativeSize,
} from '../nine-slice-options.js';
import type { SpriteMaterial } from '../materials/sprite-material.js';
import type { Texture } from '../texture.js';

/**
 * Fields of {@link SpriteEcsComponent} with no sensible default; callers
 * must always provide these.
 */
export interface SpriteRequiredOptions {
  /**
   * The sprite's width in world units. Scales the unit quad horizontally
   * before it's rotated and translated to the entity's world position.
   */
  width: number;

  /**
   * The sprite's height in world units. Scales the unit quad vertically
   * before it's rotated and translated to the entity's world position.
   */
  height: number;

  /**
   * The image the sprite draws, sampled within `uvOffset`/`uvScale`. Assign
   * another texture to change the image. Consecutive sprites with the same
   * texture, emissive map and material draw in one instanced draw call.
   */
  texture: Texture;
}

/**
 * An emissive map: light a sprite gives off, added on top of its tinted
 * texture unaffected by tint.
 */
export interface SpriteEmissive {
  /**
   * The emissive map, sampled at the same UVs as the sprite's `texture`. A
   * greyscale mask works well, colored by `color`.
   */
  texture: Texture;

  /**
   * Multiplies the map's RGB. Channels above `1` push the glow into HDR
   * range, for `createBloomEcsSystem` on an `hdr` render target to bloom.
   */
  color: Color;
}

/**
 * Fields of {@link SpriteEcsComponent} with a sensible default; callers may
 * omit these.
 */
export interface SpriteDefaultedOptions {
  /**
   * The sprite's origin, normalized to the sprite's own size: `(0, 0)` is
   * the bottom-left corner, `(0.5, 0.5)` (the default) is the center, and
   * `(1, 1)` is the top-right corner - Y-up, matching every other
   * Y-facing value in the engine (world position, rotation). Determines
   * which point of the sprite is placed at, and rotated/scaled around, the
   * entity's position.
   */
  pivot: Vector2;

  /**
   * A color multiplied against the sprite's sampled texture color (RGB
   * only; the texture's own alpha is used unmodified) to tint it. Defaults
   * to `Color.white`, which leaves the texture unmodified.
   */
  tintColor: Color;

  /**
   * The top-left corner of the region of the texture to sample, as a
   * normalized (0 to 1) fraction of the texture's full size. Used with
   * `uvScale` to select a single frame from a texture atlas/sprite sheet;
   * updated automatically by the sprite animation system when the sprite
   * has a `SpriteAnimationEcsComponent`.
   */
  uvOffset: Vector2;

  /**
   * The size of the region of the texture to sample, as a normalized (0 to
   * 1) fraction of the texture's full width/height. Defaults to `(1, 1)`
   * (the whole texture). Used with `uvOffset` to select a single frame from
   * a texture atlas/sprite sheet.
   */
  uvScale: Vector2;

  /**
   * The sprite's emissive map, or `null` (the default) for none. Assign
   * another to change the sprite's glow.
   */
  emissive: SpriteEmissive | null;

  /**
   * The material the sprite draws with, from `createSpriteMaterial`, or
   * `null` (the default) for the render context's shared
   * `spriteMaterial`.
   */
  material: SpriteMaterial | null;

  /**
   * The render category the sprite belongs to, matched against each
   * camera's `cullingMask` to decide which cameras draw it. Defaults to
   * `1`, as for text.
   */
  category: number;

  /**
   * Whether this sprite is drawn. When `false`, the render system skips
   * this entity entirely for every camera, before any culling-mask check.
   */
  enabled: boolean;

  /**
   * The draw-order layer for this sprite, relative to other sprites drawn by
   * the same camera: lower layers are drawn first, so higher layers appear
   * on top. Sprites in the same layer are then ordered by depth (world Y
   * position).
   */
  layer: number;

  /**
   * Nine-slice ("9-patch") configuration. When set, the render system draws
   * this sprite as up to nine regions (four fixed-size corners, four
   * stretched/tiled edges, and a stretched/tiled center) instead of a single
   * stretched quad, so corner artwork keeps its size as `width`/`height`
   * change. Omit for a normal, single-quad sprite.
   *
   * `addSpriteComponent` fills in any omitted
   * `nativeWidth`/`nativeHeight` from the sprite's `width`/`height` at the
   * moment it's attached, so resizing the sprite afterwards never changes
   * which part of the texture its borders sample.
   */
  slices?: NineSliceOptions;
}

export interface SpriteEcsComponent
  extends SpriteRequiredOptions, SpriteDefaultedOptions {
  /**
   * Overrides the depth this sprite is sorted by within its `layer`, in
   * place of the default (`position.world.y`). Lower values draw first
   * (further back). Left `undefined`, sprites sort by world Y as before -
   * this is a genuinely optional field, not one with a `0` default, since
   * `0` would silently override world-Y sorting for every sprite.
   */
  sortDepth?: number;

  /**
   * An additional multiplier applied to `tintColor.a` when computing this
   * sprite's final rendered alpha, on top of (not instead of) the tint's
   * own alpha. Left `undefined`, this sprite renders at `tintColor.a`
   * alone - a genuinely optional field, not one with a `1` default, kept
   * separate from `tintColor.a` so a system can apply an environment-wide
   * fade (e.g. `@forge-game-engine/forge/ui`'s `CanvasGroupEcsComponent`,
   * via `createUiCanvasGroupEcsSystem`) without overwriting - and later
   * needing to restore - whatever alpha the caller authored on `tintColor`
   * itself.
   */
  opacityMultiplier?: number;
}

export const spriteId = createComponentId<SpriteEcsComponent>('sprite');

/**
 * Attaches a {@link SpriteEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the sprite. `width`, `height`,
 * and `texture` have no sensible default and must always be provided.
 * `pivot`, `uvOffset`, `uvScale` and `slices` are copied, so the component
 * never shares them with `options` or with other sprites built from the same
 * options. If `slices` is set, any omitted `nativeWidth`/`nativeHeight` is
 * captured from `width`/`height` here, before anything can resize the
 * sprite.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addSpriteComponent(
  world: EcsWorld,
  entity: number,
  options: SpriteRequiredOptions & Partial<SpriteEcsComponent>,
): SpriteEcsComponent {
  const defaultSpriteOptions: SpriteDefaultedOptions = {
    pivot: { x: 0.5, y: 0.5 },
    tintColor: Color.white,
    uvOffset: Vec2.zero,
    uvScale: Vec2.one,
    emissive: null,
    material: null,
    category: 1,
    enabled: true,
    layer: 0,
  };

  const component: SpriteEcsComponent = {
    ...defaultSpriteOptions,
    ...options,
  };

  // Systems write these vectors in place per entity (the sprite animation
  // system writes each entity's frame into `uvOffset`, UI layout writes
  // `pivot`), so every component gets its own copies, however `options`
  // was built: sprites created from one shared options object must never
  // share a frame or pivot.
  component.pivot = Vec2.clone(component.pivot);
  component.uvOffset = Vec2.clone(component.uvOffset);
  component.uvScale = Vec2.clone(component.uvScale);

  if (component.slices) {
    component.slices = resolveNineSliceNativeSize(
      component.slices,
      component.width,
      component.height,
    );
  }

  return world.addComponent(entity, spriteId, component);
}
