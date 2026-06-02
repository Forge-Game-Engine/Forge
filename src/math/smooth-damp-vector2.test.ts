import { describe, expect, it } from 'vitest';
import { smoothDampVector2 } from './smooth-damp-vector2';
import { Vector2 } from './vector2';

describe('smoothDamp Vector2', () => {
  it('returns target position and zero velocity when already at target', () => {
    const position = new Vector2(1, 2);
    const target = new Vector2(1, 2);
    const velocity = new Vector2(0, 0);
    const maxSpeed = 10;
    const smoothTime = 0.5;
    const deltaTime = 0.016;

    const { positionOutput, velocityOutput } = smoothDampVector2(
      position,
      target,
      velocity,
      maxSpeed,
      smoothTime,
      deltaTime,
    );

    expect(positionOutput.x).toBeCloseTo(target.x);
    expect(positionOutput.y).toBeCloseTo(target.y);
    expect(velocityOutput.x).toBeCloseTo(0);
    expect(velocityOutput.y).toBeCloseTo(0);
  });

  it('moves position closer to target', () => {
    const position = new Vector2(0, 0);
    const target = new Vector2(10, 0);
    const velocity = new Vector2(0, 0);
    const maxSpeed = 100;
    const smoothTime = 0.5;
    const deltaTime = 0.016;

    const { positionOutput } = smoothDampVector2(
      position,
      target,
      velocity,
      maxSpeed,
      smoothTime,
      deltaTime,
    );

    expect(positionOutput.x).toBeGreaterThan(position.x);
    expect(positionOutput.x).toBeLessThan(target.x);
    expect(positionOutput.y).toBeCloseTo(0);
  });

  it('limits movement by maxSpeed', () => {
    const position = new Vector2(0, 0);
    const target = new Vector2(1000, 0);
    const velocity = new Vector2(0, 0);
    const maxSpeed = 1;
    const smoothTime = 0.5;
    const deltaTime = 0.016;

    const { positionOutput } = smoothDampVector2(
      position,
      target,
      velocity,
      maxSpeed,
      smoothTime,
      deltaTime,
    );

    // Should not move more than maxSpeed * smoothTime in one step
    const maxChange = maxSpeed * smoothTime;
    expect(positionOutput.x - position.x).toBeLessThanOrEqual(maxChange + 1e-6);
  });

  it('returns correct velocity output', () => {
    const position = new Vector2(0, 0);
    const target = new Vector2(10, 0);
    const velocity = new Vector2(0, 0);
    const maxSpeed = 100;
    const smoothTime = 0.5;
    const deltaTime = 0.016;

    const { velocityOutput } = smoothDampVector2(
      position,
      target,
      velocity,
      maxSpeed,
      smoothTime,
      deltaTime,
    );

    // Should be moving towards the target
    expect(velocityOutput.x).toBeGreaterThan(0);
    expect(velocityOutput.y).toBeCloseTo(0);
  });

  it('handles negative velocity', () => {
    const position = new Vector2(10, 0);
    const target = new Vector2(0, 0);
    const velocity = new Vector2(-5, 0);
    const maxSpeed = 100;
    const smoothTime = 0.5;
    const deltaTime = 0.016;

    const { positionOutput, velocityOutput } = smoothDampVector2(
      position,
      target,
      velocity,
      maxSpeed,
      smoothTime,
      deltaTime,
    );

    expect(positionOutput.x).toBeLessThan(position.x);
    expect(velocityOutput.x).toBeLessThan(0);
  });

  it('does not overshoot the target', () => {
    const position = new Vector2(0, 0);
    const target = new Vector2(1, 0);
    const velocity = new Vector2(1000, 0);
    const maxSpeed = 1000;
    const smoothTime = 0.01;
    const deltaTime = 0.5;

    const { positionOutput } = smoothDampVector2(
      position,
      target,
      velocity,
      maxSpeed,
      smoothTime,
      deltaTime,
    );

    // Should clamp to target, not overshoot (allowing for small floating-point error)
    expect(positionOutput.x).toBeLessThanOrEqual(target.x + 1e-6);
  });
});
