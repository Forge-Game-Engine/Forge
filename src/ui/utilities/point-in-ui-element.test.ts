import { describe, expect, it } from 'vitest';
import { Matrix3x3, Rect, Vector2 } from '../../math/index';
import { UiTransformEcsComponent } from '../components/ui-transform-component';
import { pointInUiElement } from './point-in-ui-element';

// Builds a minimal transform for a non-rotated rect at (ox, oy) with size (w, h).
function makeTransform(
  ox: number,
  oy: number,
  w: number,
  h: number,
  rotation = 0,
  clipRect?: Rect | null,
): UiTransformEcsComponent {
  const resolvedRect = new Rect(new Vector2(ox, oy), new Vector2(w, h));

  // Replicate the layout system's worldMatrix computation for a
  // non-rotated element (pivot = 0.5, scale = 1):
  //   translate(ox + pivotX, oy + pivotY)
  //   rotate(rotation)
  //   scale(1, 1)
  //   translate(-pivotX, -pivotY)
  //   scale(w, h)
  const pivotX = 0.5 * w;
  const pivotY = 0.5 * h;
  const worldMatrix = Matrix3x3.identity
    .translate(ox + pivotX, oy + pivotY)
    .rotate(rotation)
    .scale(1, 1)
    .translate(-pivotX, -pivotY)
    .scale(w, h);

  return {
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 1),
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(0, 0),
    pivot: new Vector2(0.5, 0.5),
    rotation,
    scale: new Vector2(1, 1),
    resolvedRect,
    worldMatrix,
    clipRect: clipRect ?? null,
  };
}

describe('pointInUiElement', () => {
  describe('axis-aligned rect', () => {
    it('returns true for a point inside the element', () => {
      const t = makeTransform(100, 200, 80, 40);

      expect(pointInUiElement(new Vector2(140, 220), t)).toBe(true);
    });

    it('returns true for the top-left corner', () => {
      const t = makeTransform(100, 200, 80, 40);

      expect(pointInUiElement(new Vector2(100, 200), t)).toBe(true);
    });

    it('returns true for the bottom-right corner', () => {
      const t = makeTransform(100, 200, 80, 40);

      expect(pointInUiElement(new Vector2(180, 240), t)).toBe(true);
    });

    it('returns false for a point just outside the left edge', () => {
      const t = makeTransform(100, 200, 80, 40);

      expect(pointInUiElement(new Vector2(99.9, 220), t)).toBe(false);
    });

    it('returns false for a point just outside the bottom edge', () => {
      const t = makeTransform(100, 200, 80, 40);

      expect(pointInUiElement(new Vector2(140, 240.1), t)).toBe(false);
    });

    it('returns false for a point completely outside', () => {
      const t = makeTransform(100, 200, 80, 40);

      expect(pointInUiElement(new Vector2(0, 0), t)).toBe(false);
    });
  });

  describe('hit padding', () => {
    it('includes a point just outside the rect when padding is applied', () => {
      const t = makeTransform(100, 200, 80, 40);

      // Point is 5 px left of the rect. Padding of 10 should include it.
      expect(pointInUiElement(new Vector2(95, 220), t, 10)).toBe(true);
    });

    it('excludes a point beyond the padding', () => {
      const t = makeTransform(100, 200, 80, 40);

      // Point is 15 px left of the rect. Padding of 10 should not include it.
      expect(pointInUiElement(new Vector2(85, 220), t, 10)).toBe(false);
    });
  });

  describe('clip rect', () => {
    it('rejects a point inside the element but outside the clip rect', () => {
      const clip = new Rect(new Vector2(0, 0), new Vector2(50, 50));
      const t = makeTransform(40, 40, 80, 40, 0, clip);

      // Centre is at (80, 60), which is outside the 50×50 clip.
      expect(pointInUiElement(new Vector2(80, 60), t)).toBe(false);
    });

    it('accepts a point inside both the element and the clip rect', () => {
      const clip = new Rect(new Vector2(0, 0), new Vector2(200, 200));
      const t = makeTransform(40, 40, 80, 40, 0, clip);

      expect(pointInUiElement(new Vector2(80, 60), t)).toBe(true);
    });

    it('accepts all points when clipRect is null', () => {
      const t = makeTransform(0, 0, 100, 100, 0, null);

      expect(pointInUiElement(new Vector2(50, 50), t)).toBe(true);
    });
  });

  describe('rotated element', () => {
    it('hits the centre of a 45-degree rotated element', () => {
      // A 100×100 element centred at (200, 200), rotated 45 deg.
      // Its centre remains at (200, 200) in screen space.
      const t = makeTransform(150, 150, 100, 100, Math.PI / 4);

      expect(pointInUiElement(new Vector2(200, 200), t)).toBe(true);
    });

    it('misses a corner of an axis-aligned rect that rotated away', () => {
      // The original top-left corner (150, 150) is no longer inside a 45-deg
      // rotated element (it lies outside the rotated diamond shape).
      const t = makeTransform(150, 150, 100, 100, Math.PI / 4);

      expect(pointInUiElement(new Vector2(150, 150), t)).toBe(false);
    });
  });

  describe('degenerate transform', () => {
    it('returns false when the element has zero size', () => {
      const t = makeTransform(100, 200, 0, 0);

      expect(pointInUiElement(new Vector2(100, 200), t)).toBe(false);
    });
  });
});
