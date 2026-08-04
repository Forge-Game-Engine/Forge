import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';

/**
 * Smoothly moves this entity's `PositionEcsComponent` towards `targetEntity`'s
 * current position (plus `offset`), via `smoothDampVector2`.
 * `createCameraFollowEcsSystem` applies this every tick; demo-only, since
 * the engine's `CameraEcsComponent` only supports input-driven pan/zoom, not
 * following an arbitrary entity. Used here to keep the car on screen as it
 * drives across a course much wider than the canvas.
 */
export interface CameraFollowEcsComponent {
  targetEntity: number;

  /**
   * A fixed world-space offset added to `target.position`, e.g. to frame
   * more of the track ahead of the car than behind it.
   */
  offset: Vector2;

  /**
   * The approximate time, in seconds, `smoothDampVector2` takes to catch up
   * to `target`. Smaller values follow more tightly.
   */
  smoothTime: number;

  /**
   * The maximum speed, in world units/s, the camera may move at while
   * catching up, so a sudden large jump in `target.position` (a reset, a
   * hard landing) doesn't whip the camera across the screen.
   */
  maxSpeed: number;

  /**
   * `smoothDampVector2`'s running velocity state, carried from tick to
   * tick. Starts at zero.
   */
  velocity: Vector2;
}

export const cameraFollowId =
  createComponentId<CameraFollowEcsComponent>('cameraFollow');

export interface CameraFollowOptions {
  targetEntity: number;
  offset?: Vector2;
  smoothTime: number;
  maxSpeed: number;
}

const defaultCameraFollowOptions = {
  offset: Vec2.zero,
};

export function addCameraFollowComponent(
  world: EcsWorld,
  entity: number,
  options: CameraFollowOptions,
): CameraFollowEcsComponent {
  const { targetEntity, offset, smoothTime, maxSpeed } = {
    ...defaultCameraFollowOptions,
    ...options,
  };

  const component: CameraFollowEcsComponent = {
    targetEntity,
    // clone: `offset` may be `defaultCameraFollowOptions.offset`, a single
    // shared instance reused across every entity that omits its own offset.
    offset: Vec2.clone(offset),
    smoothTime,
    maxSpeed,
    velocity: Vec2.zero,
  };

  return world.addComponent(entity, cameraFollowId, component);
}
