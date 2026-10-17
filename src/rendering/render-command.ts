import type { Matrix3x3, Rect } from '../math/index.js';
import type { FontAtlas } from '../text/font-atlas/font-atlas.js';
import type { MeshEcsComponent } from './components/mesh-component.js';
import type { InstanceComponents, Renderable } from './renderable.js';
import type { Texture } from './texture.js';
import type { InstanceMask } from './utilities/resolve-instance-mask.js';

/**
 * One quad the render system draws: a sprite, a nine-slice region or a
 * glyph. Consecutive commands (in draw order) with the same `renderable`,
 * `texture` and `emissiveTexture` draw as one instanced batch.
 */
export interface QuadRenderCommand {
  kind: 'quad';
  renderable: Renderable;
  /** The texture the quad samples: a sprite's texture or a font atlas's. */
  texture: Texture;
  /** A sprite's emissive map, or `null` for none. */
  emissiveTexture: Texture | null;
  /** The font atlas a glyph is drawn from; `undefined` for sprites. */
  fontAtlas?: FontAtlas;
  components: InstanceComponents;
}

/**
 * One mesh the render system draws: a range of its geometry's elements.
 * Neighboring mesh commands (in draw order) with the same geometry,
 * material, model matrix and mask, whose ranges follow on from one another
 * on a list topology, draw in one draw call. A mesh ends the instanced
 * batch before it, so quads on either side of it in the draw order never
 * batch together.
 *
 * Each mesh draw item keeps one command, with its matrix and rect, across
 * frames, and writes every field before it's read each frame.
 */
export interface MeshRenderCommand {
  kind: 'mesh';
  mesh: MeshEcsComponent;
  /** The entity's world transform: translate, then rotate, then scale. */
  readonly model: Matrix3x3;
  /**
   * The first element to draw: the mesh's section's `start`, or `0` for the
   * whole geometry.
   */
  start: number;
  /**
   * The number of elements to draw: the section's `count`, or the
   * geometry's current `elementCount`.
   */
  count: number;
  /**
   * The world-space bounds of what's drawn: `model` applied to the
   * section's bounds, or the geometry's.
   */
  readonly bounds: Rect;
  /**
   * The masks (see `MaskEcsComponent`) on the entity and its ancestors,
   * combined, or `null` when none apply.
   */
  mask: InstanceMask | null;
}

/** One thing the render system draws, in draw order. */
export type RenderCommand = QuadRenderCommand | MeshRenderCommand;
