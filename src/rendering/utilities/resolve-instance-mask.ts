import {
  FlipEcsComponent,
  flipId,
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  ScaleEcsComponent,
  scaleId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { QueryMatches } from '../../ecs/query-result.js';
import { clamp, Rect, Rects, Vector2 } from '../../math/index.js';
import {
  LinearMaskOrigin,
  MaskEcsComponent,
  maskId,
} from '../components/mask-component.js';

/**
 * A linear or radial mask, as the shader tests it: a fragment's world
 * position is turned into mask coordinates, `-1` to `1` across the mask's
 * rect on each axis, by `axes * (world - origin)`.
 */
interface InstanceShapeMaskFrame {
  /** The center of the mask's rect, in world space. */
  origin: Vector2;

  /**
   * The rows of the 2x2 matrix from a world offset to mask coordinates:
   * `x = xx * dx + xy * dy`, `y = yx * dx + yy * dy`.
   */
  axes: { xx: number; xy: number; yx: number; yy: number };
}

/**
 * A linear mask. Its axes are turned so the edge it reveals from is always
 * mask coordinate `x = -1`; `edge` is how far the revealed part reaches.
 */
export interface InstanceLinearMask extends InstanceShapeMaskFrame {
  kind: 'linear';
  edge: number;
}

/**
 * A radial mask: the sector from `startAngle` through `filledSweep`
 * (`sweep * amount`), with angles measured in the rect's own units, which
 * are `aspect` (width over height) times wider than mask coordinates.
 */
export interface InstanceRadialMask extends InstanceShapeMaskFrame {
  kind: 'radial';
  startAngle: number;
  filledSweep: number;
  aspect: number;
}

/** The single linear or radial mask an instance is drawn through. */
export type InstanceShapeMask = InstanceLinearMask | InstanceRadialMask;

/**
 * Every mask an instance is drawn through, combined: the intersection of
 * its rect masks, and at most one linear or radial mask.
 */
export interface InstanceMask {
  /**
   * Whether any of the instance can show. `false` when a mask has no area
   * (a zero size or scale, `amount: 0`) or the rect masks don't overlap.
   */
  visible: boolean;

  /** The intersection of the world-space bounds of every rect mask. */
  clip: Rect;

  /**
   * `clip` intersected with the shape mask's world-space bounds: nothing
   * outside it shows, so instances outside it needn't be drawn.
   */
  bounds: Rect;

  /** The linear or radial mask, or `null` for none. */
  shape: InstanceShapeMask | null;
}

/**
 * Returns the masks an entity's sprites and text are drawn through, or
 * `null` when no mask applies.
 */
export type InstanceMaskResolver = (entity: number) => InstanceMask | null;

const unmaskedResolver: InstanceMaskResolver = () => null;

const hiddenMask = (): InstanceMask => ({
  visible: false,
  clip: Rects.zero,
  bounds: Rects.zero,
  shape: null,
});

const intersectRects = (a: Rect, b: Rect): Rect => ({
  min: { x: Math.max(a.min.x, b.min.x), y: Math.max(a.min.y, b.min.y) },
  max: { x: Math.min(a.max.x, b.max.x), y: Math.min(a.max.y, b.max.y) },
});

const isEmptyRect = (rect: Rect): boolean =>
  rect.min.x >= rect.max.x || rect.min.y >= rect.max.y;

const infiniteRect = (): Rect => ({
  min: { x: -Infinity, y: -Infinity },
  max: { x: Infinity, y: Infinity },
});

/**
 * Turns a linear mask's axes so its origin edge lands on `x = -1`. The
 * mask's rect is the square `-1` to `1` in mask coordinates, so turning or
 * mirroring them leaves the rect where it is.
 */
const linearAxesByOrigin: Record<
  LinearMaskOrigin,
  (axes: InstanceShapeMaskFrame['axes']) => InstanceShapeMaskFrame['axes']
> = {
  left: (axes) => axes,
  right: ({ xx, xy, yx, yy }) => ({ xx: -xx, xy: -xy, yx, yy }),
  bottom: ({ xx, xy, yx, yy }) => ({ xx: yx, xy: yy, yx: xx, yy: xy }),
  top: ({ xx, xy, yx, yy }) => ({ xx: -yx, xy: -yy, yx: xx, yy: xy }),
};

interface MaskTransformAccessors {
  getMask: (entity: number) => MaskEcsComponent | null;
  getPosition: (entity: number) => PositionEcsComponent | null;
  getRotation: (entity: number) => RotationEcsComponent | null;
  getScale: (entity: number) => ScaleEcsComponent | null;
  getFlip: (entity: number) => FlipEcsComponent | null;
}

/**
 * Combines `inherited` (the masks above `entity`) with `entity`'s own mask.
 */
function applyMask(
  inherited: InstanceMask | null,
  entity: number,
  mask: MaskEcsComponent,
  accessors: MaskTransformAccessors,
): InstanceMask {
  if (inherited && !inherited.visible) {
    return inherited;
  }

  const position = accessors.getPosition(entity);

  if (!position) {
    throw new Error(
      `Entity ${entity} has a mask but no position; a mask is placed by its entity's position.`,
    );
  }

  const flip = accessors.getFlip(entity);
  const scale = accessors.getScale(entity);
  const radians = accessors.getRotation(entity)?.world ?? 0;
  const scaleX = (scale?.world.x ?? 1) * (flip?.flipX ? -1 : 1);
  const scaleY = (scale?.world.y ?? 1) * (flip?.flipY ? -1 : 1);
  const halfWidth = (mask.width * scaleX) / 2;
  const halfHeight = (mask.height * scaleY) / 2;

  if (halfWidth === 0 || halfHeight === 0) {
    return hiddenMask();
  }

  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  // The rect's center relative to the entity's position, before rotation.
  const centerX = (0.5 - mask.pivot.x) * mask.width * scaleX;
  const centerY = (0.5 - mask.pivot.y) * mask.height * scaleY;
  const origin = {
    x: position.world.x + centerX * cos - centerY * sin,
    y: position.world.y + centerX * sin + centerY * cos,
  };
  const extentX = Math.abs(halfWidth * cos) + Math.abs(halfHeight * sin);
  const extentY = Math.abs(halfWidth * sin) + Math.abs(halfHeight * cos);
  const maskBounds: Rect = {
    min: { x: origin.x - extentX, y: origin.y - extentY },
    max: { x: origin.x + extentX, y: origin.y + extentY },
  };
  const clip = inherited?.clip ?? infiniteRect();
  const bounds = inherited?.bounds ?? infiniteRect();
  const { shape } = mask;

  if (shape.kind === 'rect') {
    const maskedClip = intersectRects(clip, maskBounds);
    const maskedBounds = intersectRects(bounds, maskBounds);

    if (isEmptyRect(maskedBounds)) {
      return hiddenMask();
    }

    return {
      visible: true,
      clip: maskedClip,
      bounds: maskedBounds,
      shape: inherited?.shape ?? null,
    };
  }

  if (inherited?.shape) {
    throw new Error(
      `Entity ${entity} has a ${shape.kind} mask inside another linear or radial mask; content can be clipped by at most one linear or radial mask.`,
    );
  }

  const amount = clamp(shape.amount, 0, 1);
  const maskedBounds = intersectRects(bounds, maskBounds);

  if (amount === 0 || isEmptyRect(maskedBounds)) {
    return hiddenMask();
  }

  // World offset -> mask coordinates: undo the rotation, then divide by the
  // (scaled, flipped) half size.
  const axes = {
    xx: cos / halfWidth,
    xy: sin / halfWidth,
    yx: -sin / halfHeight,
    yy: cos / halfHeight,
  };

  if (shape.kind === 'linear') {
    return {
      visible: true,
      clip,
      bounds: maskedBounds,
      shape: {
        kind: 'linear',
        origin,
        axes: linearAxesByOrigin[shape.origin](axes),
        // Fully revealed reaches past the rect's far edge, so that edge is
        // anti-aliased once, by the rect, rather than twice.
        edge: amount === 1 ? 2 : amount * 2 - 1,
      },
    };
  }

  return {
    visible: true,
    clip,
    bounds: maskedBounds,
    shape: {
      kind: 'radial',
      origin,
      axes,
      startAngle: shape.startAngle,
      filledSweep: shape.sweep * amount,
      aspect: mask.width / mask.height,
    },
  };
}

/**
 * Creates a function that finds the masks (see `MaskEcsComponent`) an
 * entity's sprites and text are drawn through: the entity's own mask and
 * those of its ancestors. Each entity is resolved once per resolver, so the
 * render system creates one per frame. When the world has no masks, it
 * returns `null` for every entity without walking the hierarchy.
 * @param world - The world the entities belong to.
 * @param masks - Every entity with a `MaskEcsComponent`: the render system's
 * declared query for them, or `world.query([maskId])` outside a system.
 * @returns The resolver.
 * @throws From the resolver: an error if two linear or radial masks apply
 * to one entity, or a mask's entity has no position.
 */
export function createInstanceMaskResolver(
  world: EcsWorld,
  masks: QueryMatches<[MaskEcsComponent]>,
): InstanceMaskResolver {
  if (masks.entities.length === 0) {
    return unmaskedResolver;
  }

  const accessors: MaskTransformAccessors = {
    getMask: world.getComponentAccessor<MaskEcsComponent>(maskId),
    getPosition: world.getComponentAccessor<PositionEcsComponent>(positionId),
    getRotation: world.getComponentAccessor<RotationEcsComponent>(rotationId),
    getScale: world.getComponentAccessor<ScaleEcsComponent>(scaleId),
    getFlip: world.getComponentAccessor<FlipEcsComponent>(flipId),
  };
  const resolved = new Map<number, InstanceMask | null>();

  const resolve: InstanceMaskResolver = (entity) => {
    const cached = resolved.get(entity);

    if (cached !== undefined) {
      return cached;
    }

    const parent = world.getParent(entity);
    const inherited = parent === null ? null : resolve(parent);
    const mask = accessors.getMask(entity);
    const result = mask
      ? applyMask(inherited, entity, mask, accessors)
      : inherited;

    resolved.set(entity, result);

    return result;
  };

  return resolve;
}
