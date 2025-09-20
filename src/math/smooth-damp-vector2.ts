import { Vector2 } from './vector2';

// this function implements a smooth damp follow behavior, found from here:
// https://github.com/Unity-Technologies/UnityCsReference/blob/02d565cf3dd0f6b15069ba976064c75dc2705b08/Runtime/Export/Math/Vector2.cs#L243

/**
 * Gradually changes a 2D position towards a target position using a smoothing function,
 * simulating a critically damped spring. This function is useful for smooth interpolation
 * of positions (e.g., camera movement, UI elements) where you want to avoid overshooting
 * and oscillation.
 *
 * @param position - The current position as a Vector2.
 * @param targetPosition - The target position to move towards as a Vector2.
 * @param velocity - The current velocity as a Vector2. This value is modified by the function.
 * @param maxSpeed - The maximum speed at which the position can change.
 * @param smoothTime - The approximate time it takes to reach the target. Smaller values result in faster movement.
 * @param deltaTimeInSeconds - The time elapsed since the last call, in seconds.
 * @returns An object containing:
 *   - `positionOutput`: The new, smoothed position as a Vector2.
 *   - `velocityOutput`: The updated velocity as a Vector2.
 *
 * @remarks
 * This function prevents overshooting and clamps the maximum change per update to `maxSpeed * smoothTime`.
 * The velocity parameter is updated to reflect the current rate of change and should be reused between calls.
 */
export function smoothDampVector2(
  position: Vector2,
  targetPosition: Vector2,
  velocity: Vector2,
  maxSpeed: number,
  smoothTime: number,
  deltaTimeInSeconds: number,
): { positionOutput: Vector2; velocityOutput: Vector2 } {
  let targetX = targetPosition.x;
  let targetY = targetPosition.y;

  const velocityOutput = new Vector2(velocity.x, velocity.y);

  const omega = 2 / smoothTime;

  const x = omega * deltaTimeInSeconds;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  let changeX = position.x - targetX;
  let changeY = position.y - targetY;

  const originalToX = targetX;
  const originalToY = targetY;

  const maxChange = maxSpeed * smoothTime;
  const maxChangeSquared = maxChange * maxChange;

  const changeSquared = changeX * changeX + changeY * changeY;

  if (changeSquared > maxChangeSquared) {
    const magnitude = Math.sqrt(changeSquared);
    changeX = (changeX / magnitude) * maxChange;
    changeY = (changeY / magnitude) * maxChange;
  }

  targetX = position.x - changeX;
  targetY = position.y - changeY;

  const tempValsX = (velocityOutput.x + omega * changeX) * deltaTimeInSeconds;
  const tempValsY = (velocityOutput.y + omega * changeY) * deltaTimeInSeconds;

  velocityOutput.x = (velocityOutput.x - omega * tempValsX) * exp;
  velocityOutput.y = (velocityOutput.y - omega * tempValsY) * exp;

  const positionOutput = new Vector2(
    targetX + (changeX + tempValsX) * exp,
    targetY + (changeY + tempValsY) * exp,
  );

  //prevent over-shooting
  const originMinusCurrentPosX = originalToX - position.x;
  const originMinusCurrentPosY = originalToY - position.y;
  const newPosMinusOriginX = position.x - originalToX;
  const newPosMinusOriginY = position.y - originalToY;

  if (
    originMinusCurrentPosX * newPosMinusOriginX +
      originMinusCurrentPosY * newPosMinusOriginY >
    0
  ) {
    positionOutput.x = originalToX;
    positionOutput.y = originalToY;

    velocityOutput.x = (position.x - originalToX) / deltaTimeInSeconds;
    velocityOutput.y = (position.y - originalToY) / deltaTimeInSeconds;
  }

  return { positionOutput, velocityOutput };
}
