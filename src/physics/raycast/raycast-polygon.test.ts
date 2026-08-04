import { describe, expect, it } from 'vitest';
import { raycastPolygon } from './raycast-polygon.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { Vector2 } from '../../math/index.js';

function rectangle(width: number, height: number): PolygonCollider {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonCollider([
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ]);
}

function body(
  position: Vector2,
  collider: PolygonCollider,
  rotation: number = 0,
): CollisionBody {
  return { position, rotation, collider };
}

describe('raycastPolygon', () => {
  it('should return null when the ray misses the polygon', () => {
    const polygonBody = body({ x: 0, y: 5 }, rectangle(2, 2));

    const hit = raycastPolygon(polygonBody, { x: -5, y: 0 }, { x: 5, y: 0 });

    expect(hit).toBeNull();
  });

  it('should hit the nearest face in world space', () => {
    const polygonBody = body({ x: 3, y: 0 }, rectangle(2, 2));

    const hit = raycastPolygon(polygonBody, { x: -5, y: 0 }, { x: 5, y: 0 });

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(2);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
  });

  it('should account for the polygon body rotation', () => {
    const polygonBody = body({ x: 0, y: 0 }, rectangle(2, 4), Math.PI / 2);

    // Rotated 90 degrees, the polygon's local x-axis (its short face) now
    // points along world y, so a ray traveling along x hits the (now
    // vertical) long face at world x = -2 instead of the unrotated x = -1.
    const hit = raycastPolygon(polygonBody, { x: -5, y: 0 }, { x: 5, y: 0 });

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(-2);
    expect(hit?.point.y).toBeCloseTo(0);
  });
});
