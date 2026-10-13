import { linear } from '../../../animations/easing-functions/linear.js';
import { createComponentId } from '../../../ecs/ecs-component.js';
import { EcsWorld } from '../../../ecs/ecs-world.js';
import { withDefaults } from '../../../utilities/with-defaults.js';
import { Color } from '../../color.js';
import { meshId } from '../../components/mesh-component.js';
import {
  createRibbonMeshBuffers,
  RibbonMeshBuffers,
  RibbonPoint,
  RibbonTextureMode,
} from '../../geometry/build-ribbon-mesh.js';
import type { Geometry } from '../../geometry/geometry.js';
import type { MeshMaterial } from '../../materials/mesh-material.js';
import type { Texture } from '../../texture.js';
import {
  createTrailPoints,
  getInitialTrailPointCapacity,
} from '../trail-recording.js';
import { validateTrailSettings } from '../validate-trail-settings.js';

/**
 * The settings of a trail, written by game code. Every field can be changed
 * while the trail is drawn; the trail system reads them each frame.
 */
export interface TrailSettings {
  /**
   * How long a point stays, in seconds of game time: the trail is as long
   * as the path the entity took in this time. Greater than `0`.
   */
  lifetimeSeconds: number;

  /**
   * How far the entity moves, in world units, before a new point is
   * recorded. Between recorded points the trail still reaches the entity.
   * Greater than `0`.
   */
  minVertexDistance: number;

  /** The trail's width at the entity (age `0`), in world units. `0` or more. */
  startWidth: number;

  /**
   * The trail's width at its tail (age `lifetimeSeconds`), in world units.
   * `0` or more.
   */
  endWidth: number;

  /**
   * The trail's color at the entity, straight (not premultiplied) alpha.
   * Red, green and blue can be above `1`, for bloom.
   */
  startColor: Color;

  /** The trail's color at its tail, straight alpha. */
  endColor: Color;

  /**
   * Maps a point's age, from `0` at the entity to `1` at the tail, to how
   * far its width is from `startWidth` to `endWidth`. One of the functions
   * in the animations module's easing functions, or any function of `t`.
   * A width below `0` is drawn as `0`.
   */
  widthEasing: (t: number) => number;

  /**
   * Maps a point's age, from `0` at the entity to `1` at the tail, to how
   * far its color is from `startColor` to `endColor`. Red, green and blue
   * below `0` are drawn as `0`, and alpha is kept between `0` and `1`.
   */
  colorEasing: (t: number) => number;

  /**
   * The texture laid along the trail, multiplied by its color, or `null`
   * for the color alone. In `'tile'` mode give it `wrap: 'repeat'`. Its
   * left edge is at the tail and its right edge at the entity, and its top
   * row is on the left of the direction of travel on screen, so a trail
   * moving towards `+X` shows the texture the same way up as a sprite.
   */
  texture: Texture | null;

  /**
   * How the texture runs along the trail: `'stretch'` stretches it once from
   * the tail to the entity; `'tile'` repeats it every `tileLength` world
   * units of the path, where it stays as the entity moves on.
   */
  textureMode: RibbonTextureMode;

  /**
   * The length of one repeat of the texture in `'tile'` mode, in world
   * units. Greater than `0`.
   */
  tileLength: number;

  /**
   * Whether new points are recorded. While `false`, the trail ends where
   * the entity was when it was turned off, and fades out. Turning it back
   * on starts a new piece of trail, with nothing drawn across the gap.
   */
  emitting: boolean;

  /**
   * The render category the trail belongs to, matched against each camera's
   * `cullingMask`.
   */
  category: number;

  /**
   * The draw-order layer for the trail, shared with sprites, text and
   * meshes. Within a layer the trail draws in its entity's place in the
   * draw order, behind the entity's own sprite and text.
   */
  layer: number;
}

/**
 * The points a trail has recorded, oldest first, in a ring buffer of typed
 * arrays: point `i` (from the oldest) is at index
 * `(start + i) % capacity` of each array. Grown by doubling, so recording
 * allocates nothing once it's large enough.
 */
export interface TrailPoints {
  /** The number of points each array holds, a power of two. */
  capacity: number;

  /** The index of the oldest point. */
  start: number;

  /** The number of points recorded. */
  count: number;

  /** Each point's world x position. */
  x: Float64Array;

  /** Each point's world y position. */
  y: Float64Array;

  /** The trail's `elapsedSeconds` when each point was recorded. */
  time: Float64Array;

  /** How far, in world units, the trail had come when each point was recorded. */
  distance: Float64Array;

  /**
   * `1` for a point that starts a new piece of trail (after `emitting` was
   * off, or a `clearTrail`), `0` for one joined to the point before it.
   */
  runStart: Uint8Array;
}

/**
 * The trail system's record of a trail, and the GPU data it draws with.
 * Written only by `createTrailEcsSystem`, except that removing or replacing
 * the trail disposes `geometry` and sets it to `null`.
 */
export interface TrailState {
  /** The seconds of game time the trail system has advanced this trail by. */
  elapsedSeconds: number;

  /** The recorded points. */
  points: TrailPoints;

  /** Whether the trail was emitting when the system last ran. */
  wasEmitting: boolean;

  /** The `clearRequests` the system has carried out. */
  clearsApplied: number;

  /**
   * The geometry the trail draws, created the first time the system draws
   * the trail, and disposed when the trail is removed.
   */
  geometry: Geometry | null;

  /** The trail's material, created the first time the system draws it. */
  material: MeshMaterial | null;

  /** The vertex arrays `geometry` is updated from. */
  buffers: RibbonMeshBuffers;

  /**
   * The buffers each piece of a trail is built in before the pieces are
   * joined, created the first time the trail has more than one piece.
   */
  runBuffers: RibbonMeshBuffers | null;

  /** The ribbon points of every build, reused, grown to the most built. */
  ribbonPointPool: TrailRibbonPoint[];

  /** The ribbon points of the piece being built, from `ribbonPointPool`. */
  ribbonPoints: TrailRibbonPoint[];
}

/**
 * A `RibbonPoint` the trail system reuses every frame, so its color is a
 * plain object it can write rather than a `Color`.
 */
export interface TrailRibbonPoint extends RibbonPoint {
  /** The point's color, straight alpha. */
  color: { r: number; g: number; b: number; a: number };
}

/**
 * A ribbon an entity leaves behind it as it moves, tapering and fading from
 * `startWidth` and `startColor` at the entity to `endWidth` and `endColor`
 * over `lifetimeSeconds`, like Unity's `TrailRenderer`. Add one with
 * {@link addTrailComponent}; `createTrailEcsSystem` records and draws it,
 * through a `MeshEcsComponent` it adds to the entity.
 *
 * Removing the trail, replacing it, or removing its entity removes that
 * mesh and frees the trail's GPU geometry.
 */
export interface TrailEcsComponent extends TrailSettings {
  /** How many times `clearTrail` has been called. Written only by `clearTrail`. */
  clearRequests: number;

  /** The trail system's record of the trail. Don't write it. */
  readonly state: TrailState;
}

/**
 * The component key of {@link TrailEcsComponent}. Removing or replacing a
 * trail removes the mesh that draws it and disposes its geometry.
 */
export const trailId = createComponentId<TrailEcsComponent>('trail', {
  onRemove: releaseTrail,
});

const defaultTrailSettings: TrailSettings = {
  lifetimeSeconds: 1,
  minVertexDistance: 0.1,
  startWidth: 0.25,
  endWidth: 0,
  startColor: Color.white,
  endColor: new Color(1, 1, 1, 0),
  widthEasing: linear,
  colorEasing: linear,
  texture: null,
  textureMode: 'stretch',
  tileLength: 1,
  emitting: true,
  category: 1,
  layer: 0,
};

/**
 * Attaches a {@link TrailEcsComponent} to `entity`, so it leaves a trail
 * behind it once `createTrailEcsSystem` runs. The entity also needs a
 * `PositionEcsComponent`. Creates no GPU objects: the trail system creates
 * the trail's geometry and mesh the first time it draws it. Adding a trail
 * to an entity that has one replaces it, freeing the old one.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Settings for the trail. Defaults: `lifetimeSeconds` `1`,
 * `minVertexDistance` `0.1`, `startWidth` `0.25`, `endWidth` `0`, white to
 * transparent white, `linear` easing, no texture, `'stretch'` with a
 * `tileLength` of `1`, emitting, `category` `1` and `layer` `0`.
 * @returns The attached component, for further tuning or runtime changes.
 * @throws An error if `lifetimeSeconds`, `minVertexDistance` or
 * `tileLength` isn't a finite number greater than `0`, if a width isn't a
 * finite number of `0` or more, or if the entity has a mesh that isn't its
 * trail's (a trail draws through its entity's one mesh; put the other mesh
 * on a child entity).
 */
export function addTrailComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<TrailSettings> = {},
): TrailEcsComponent {
  const settings: TrailSettings = withDefaults(defaultTrailSettings, options);

  validateTrailSettings(settings, entity);

  const mesh = world.getComponent(entity, meshId);
  const currentGeometry =
    world.getComponent(entity, trailId)?.state.geometry ?? null;

  if (mesh && mesh.geometry !== currentGeometry) {
    throw new Error(
      `Unable to add a trail to entity ${entity}: it already has a mesh, and a trail draws through its entity's one mesh. Put the other mesh on a child entity.`,
    );
  }

  const component: TrailEcsComponent = {
    ...settings,
    clearRequests: 0,
    state: {
      elapsedSeconds: 0,
      points: createTrailPoints(
        getInitialTrailPointCapacity(settings.lifetimeSeconds),
      ),
      wasEmitting: false,
      clearsApplied: 0,
      geometry: null,
      material: null,
      buffers: createRibbonMeshBuffers(2),
      runBuffers: null,
      ribbonPointPool: [],
      ribbonPoints: [],
    },
  };

  return world.addComponent(entity, trailId, component);
}

/**
 * The trail's remove hook: removes the mesh that draws the trail's geometry
 * from `entity`, disposes the geometry and forgets it, so the trail gets a
 * new one if it's added and drawn again. It runs only once the trail is no
 * longer the entity's component, so it never runs alongside the trail
 * system's update of this trail. A function declaration, so it's hoisted
 * above `trailId`, which names it.
 * @param world - The world the trail was removed from.
 * @param entity - The entity the trail belonged to.
 * @param trail - The removed trail.
 */
function releaseTrail(
  world: EcsWorld,
  entity: number,
  trail: TrailEcsComponent,
): void {
  const { geometry } = trail.state;

  if (!geometry) {
    return;
  }

  if (world.getComponent(entity, meshId)?.geometry === geometry) {
    world.removeComponent(entity, meshId);
  }

  geometry.dispose();
  trail.state.geometry = null;
}
