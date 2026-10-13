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
 * One mesh the render system draws, with one draw call of its own. A mesh
 * ends the instanced batch before it, so quads on either side of it in the
 * draw order never batch together.
 */
export interface MeshRenderCommand {
  kind: 'mesh';
  mesh: MeshEcsComponent;
  /** The entity's world transform: translate, then rotate, then scale. */
  model: Matrix3x3;
  /** The mesh's world-space bounds: `model` applied to its geometry's bounds. */
  bounds: Rect;
  /**
   * The masks (see `MaskEcsComponent`) on the entity and its ancestors,
   * combined, or `null` when none apply.
   */
  mask: InstanceMask | null;
}

/** One thing the render system draws, in draw order. */
export type RenderCommand = QuadRenderCommand | MeshRenderCommand;
