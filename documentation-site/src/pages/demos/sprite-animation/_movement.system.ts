import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import {
  FlipEcsComponent,
  flipId,
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import {
  SpriteAnimationEcsComponent,
  spriteAnimationId,
} from '@forge-game-engine/forge/animations';

/** How fast the character moves horizontally, in world units per second. */
const moveSpeedInWorldUnitsPerSecond = 220;

/** Keeps the character from wandering off the edges of the demo's viewport. */
const horizontalBoundInWorldUnits = 340;

/**
 * Creates an ECS system that moves the character with `moveInput`, switches
 * its `SpriteAnimationEcsComponent` between the idle and run clips to match,
 * and flips it via `FlipEcsComponent` to face its direction of travel - see
 * the Sprite Animations guide for the full walkthrough this demo follows.
 *
 * The query (`positionId`/`flipId`/`spriteAnimationId` together) matches
 * only the character entity in this demo, since the camera has a position
 * but no flip or sprite animation component.
 *
 * Writes `position.world` directly (rather than only `position.local`)
 * since this demo doesn't register `createTransformEcsSystem` - the same
 * convention the other demos follow (see the rolling-ball demo's
 * `_camera-follow.system.ts`).
 * @param moveInput - The horizontal movement axis, positive for rightward.
 * @param time - The time instance used to scale movement by delta time.
 * @param idleAnimationHandle - The idle clip's `AssetRegistry` handle.
 * @param runAnimationHandle - The run clip's `AssetRegistry` handle.
 */
export const createMovementEcsSystem = (
  moveInput: Axis1dAction,
  time: Time,
  idleAnimationHandle: number,
  runAnimationHandle: number,
): EcsSystem<
  [PositionEcsComponent, FlipEcsComponent, SpriteAnimationEcsComponent]
> => ({
  query: [positionId, flipId, spriteAnimationId],
  run: (result) => {
    const [position, flip, spriteAnimation] = result.components;
    const isMoving = moveInput.value !== 0;

    if (isMoving) {
      const nextX =
        position.world.x +
        moveInput.value *
          moveSpeedInWorldUnitsPerSecond *
          time.deltaTimeInSeconds;

      position.world.x = Math.max(
        -horizontalBoundInWorldUnits,
        Math.min(horizontalBoundInWorldUnits, nextX),
      );
      position.local.x = position.world.x;

      flip.flipX = moveInput.value < 0;
    }

    const desiredAnimationHandle = isMoving
      ? runAnimationHandle
      : idleAnimationHandle;

    if (spriteAnimation.animationClipHandle !== desiredAnimationHandle) {
      spriteAnimation.animationClipHandle = desiredAnimationHandle;
      // The idle and run clips have different frame counts; carrying the
      // old animationFrameIndex across a clip switch can index past the new
      // clip's frame count - see the Sprite Animations guide's
      // troubleshooting note - so it's reset on every switch.
      spriteAnimation.animationFrameIndex = 0;
    }
  },
});
