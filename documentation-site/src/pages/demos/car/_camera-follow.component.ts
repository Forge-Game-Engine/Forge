import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';

/**
 * Smoothly moves this entity (the camera) towards `targetEntity`, so the
 * car stays on screen on a course much wider than the canvas.
 */
export interface CameraFollowEcsComponent {
  targetEntity: number;

  /** Added to the target's position, to show more of the road ahead. */
  offset: Vector2;

  /** Roughly how long, in seconds, the camera takes to catch up. */
  smoothTime: number;

  /** The camera's top speed, in world units per second. */
  maxSpeed: number;

  /** The camera's current velocity, carried between ticks. */
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
