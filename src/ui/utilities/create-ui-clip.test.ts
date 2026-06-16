import { describe, expect, it } from 'vitest';
import { Rect, Vector2 } from '../../math/index';
import { intersectRects } from './create-ui-clip';

describe('intersectRects', () => {
  it('returns the overlap of two overlapping rects', () => {
    const a = new Rect(new Vector2(0, 0), new Vector2(100, 100));
    const b = new Rect(new Vector2(50, 50), new Vector2(100, 100));

    const result = intersectRects(a, b);

    expect(result).not.toBeNull();
    expect(result!.origin.x).toBe(50);
    expect(result!.origin.y).toBe(50);
    expect(result!.size.x).toBe(50);
    expect(result!.size.y).toBe(50);
  });

  it('returns null when rects do not overlap horizontally', () => {
    const a = new Rect(new Vector2(0, 0), new Vector2(50, 50));
    const b = new Rect(new Vector2(100, 0), new Vector2(50, 50));

    expect(intersectRects(a, b)).toBeNull();
  });

  it('returns null when rects do not overlap vertically', () => {
    const a = new Rect(new Vector2(0, 0), new Vector2(50, 50));
    const b = new Rect(new Vector2(0, 100), new Vector2(50, 50));

    expect(intersectRects(a, b)).toBeNull();
  });

  it('returns null for touching-but-not-overlapping rects', () => {
    const a = new Rect(new Vector2(0, 0), new Vector2(50, 50));
    const b = new Rect(new Vector2(50, 0), new Vector2(50, 50));

    expect(intersectRects(a, b)).toBeNull();
  });

  it('returns the smaller rect when one is fully inside the other', () => {
    const outer = new Rect(new Vector2(0, 0), new Vector2(200, 200));
    const inner = new Rect(new Vector2(50, 50), new Vector2(100, 100));

    const result = intersectRects(outer, inner);

    expect(result).not.toBeNull();
    expect(result!.origin.x).toBe(50);
    expect(result!.origin.y).toBe(50);
    expect(result!.size.x).toBe(100);
    expect(result!.size.y).toBe(100);
  });

  it('is commutative', () => {
    const first = new Rect(new Vector2(10, 20), new Vector2(80, 60));
    const second = new Rect(new Vector2(30, 10), new Vector2(60, 80));

    const forwardResult = intersectRects(first, second);
    const reverseResult = intersectRects(second, first);

    expect(forwardResult).not.toBeNull();
    expect(reverseResult).not.toBeNull();
    expect(forwardResult!.origin.x).toBeCloseTo(reverseResult!.origin.x);
    expect(forwardResult!.origin.y).toBeCloseTo(reverseResult!.origin.y);
    expect(forwardResult!.size.x).toBeCloseTo(reverseResult!.size.x);
    expect(forwardResult!.size.y).toBeCloseTo(reverseResult!.size.y);
  });

  it('produces correct nested intersection (three rects)', () => {
    const root = new Rect(new Vector2(0, 0), new Vector2(200, 200));
    const panel = new Rect(new Vector2(50, 50), new Vector2(100, 100));
    const child = new Rect(new Vector2(0, 0), new Vector2(200, 200));

    const panelClip = intersectRects(root, panel);
    const childClip = intersectRects(child, panelClip!);

    expect(childClip).not.toBeNull();
    expect(childClip!.origin.x).toBe(50);
    expect(childClip!.origin.y).toBe(50);
    expect(childClip!.size.x).toBe(100);
    expect(childClip!.size.y).toBe(100);
  });
});
