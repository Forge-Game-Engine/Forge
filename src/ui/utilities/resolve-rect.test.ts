import { describe, expect, it } from 'vitest';
import { resolveRect } from './resolve-rect.js';
import { Rect } from '../../math/index.js';
import { RectTransformEcsComponent } from '../components/rect-transform-component.js';
import { UiAnchor } from '../types/ui-anchor.js';

const parentRect: Rect = { min: { x: -100, y: -50 }, max: { x: 100, y: 50 } };

const buildRectTransform = (
  overrides: Partial<RectTransformEcsComponent> = {},
): RectTransformEcsComponent => ({
  anchorMin: { x: 0.5, y: 0.5 },
  anchorMax: { x: 0.5, y: 0.5 },
  pivot: { x: 0.5, y: 0.5 },
  anchoredPosition: { x: 0, y: 0 },
  sizeDelta: { x: 100, y: 100 },
  rect: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
  sortDepth: 0,
  ...overrides,
});

describe('resolveRect', () => {
  it('resolves a center point anchor', () => {
    const rectTransform = buildRectTransform({
      ...UiAnchor.center,
      sizeDelta: { x: 40, y: 20 },
    });

    expect(resolveRect(parentRect, rectTransform)).toEqual({
      min: { x: -20, y: -10 },
      max: { x: 20, y: 10 },
    });
  });

  it('resolves a top-left point anchor', () => {
    const rectTransform = buildRectTransform({
      ...UiAnchor.topLeft,
      sizeDelta: { x: 40, y: 20 },
    });

    expect(resolveRect(parentRect, rectTransform)).toEqual({
      min: { x: -100, y: 30 },
      max: { x: -60, y: 50 },
    });
  });

  it('resolves a top-right point anchor', () => {
    const rectTransform = buildRectTransform({
      ...UiAnchor.topRight,
      sizeDelta: { x: 40, y: 20 },
    });

    expect(resolveRect(parentRect, rectTransform)).toEqual({
      min: { x: 60, y: 30 },
      max: { x: 100, y: 50 },
    });
  });

  it('resolves a bottom-left point anchor', () => {
    const rectTransform = buildRectTransform({
      ...UiAnchor.bottomLeft,
      sizeDelta: { x: 40, y: 20 },
    });

    expect(resolveRect(parentRect, rectTransform)).toEqual({
      min: { x: -100, y: -50 },
      max: { x: -60, y: -30 },
    });
  });

  it('resolves a bottom-right point anchor', () => {
    const rectTransform = buildRectTransform({
      ...UiAnchor.bottomRight,
      sizeDelta: { x: 40, y: 20 },
    });

    expect(resolveRect(parentRect, rectTransform)).toEqual({
      min: { x: 60, y: -50 },
      max: { x: 100, y: -30 },
    });
  });

  it('offsets a point anchor by anchoredPosition', () => {
    const rectTransform = buildRectTransform({
      ...UiAnchor.center,
      sizeDelta: { x: 40, y: 20 },
      anchoredPosition: { x: 5, y: -5 },
    });

    expect(resolveRect(parentRect, rectTransform)).toEqual({
      min: { x: -15, y: -15 },
      max: { x: 25, y: 5 },
    });
  });

  it('stretches horizontally, sizeDelta acting as a margin', () => {
    const rectTransform = buildRectTransform({
      ...UiAnchor.stretchHorizontal,
      sizeDelta: { x: -40, y: 20 },
    });

    expect(resolveRect(parentRect, rectTransform)).toEqual({
      min: { x: -80, y: -10 },
      max: { x: 80, y: 10 },
    });
  });

  it('stretches vertically, sizeDelta acting as a margin', () => {
    const rectTransform = buildRectTransform({
      ...UiAnchor.stretchVertical,
      sizeDelta: { x: 20, y: -20 },
    });

    expect(resolveRect(parentRect, rectTransform)).toEqual({
      min: { x: -10, y: -40 },
      max: { x: 10, y: 40 },
    });
  });

  it('stretches to fill the parent rect exactly with a zero sizeDelta', () => {
    const rectTransform = buildRectTransform({
      ...UiAnchor.stretchAll,
      sizeDelta: { x: 0, y: 0 },
    });

    expect(resolveRect(parentRect, rectTransform)).toEqual(parentRect);
  });

  it('resolves three levels deep', () => {
    const level1 = resolveRect(
      parentRect,
      buildRectTransform({
        ...UiAnchor.stretchAll,
        sizeDelta: { x: -20, y: -20 },
      }),
    );
    const level2 = resolveRect(
      level1,
      buildRectTransform({ ...UiAnchor.topRight, sizeDelta: { x: 30, y: 20 } }),
    );
    const level3 = resolveRect(
      level2,
      buildRectTransform({ ...UiAnchor.center, sizeDelta: { x: 10, y: 10 } }),
    );

    // level1 = parentRect inset by 10 on every side: (-90,-40) to (90,40)
    expect(level1).toEqual({ min: { x: -90, y: -40 }, max: { x: 90, y: 40 } });
    // level2 = top-right 30x20 box of level1
    expect(level2).toEqual({ min: { x: 60, y: 20 }, max: { x: 90, y: 40 } });
    // level3 = centered 10x10 box of level2
    expect(level3).toEqual({ min: { x: 70, y: 25 }, max: { x: 80, y: 35 } });
  });

  it('resolves against a zero-size parent rect to a rect at the parent origin', () => {
    const zeroParent: Rect = { min: { x: 5, y: 5 }, max: { x: 5, y: 5 } };
    const rectTransform = buildRectTransform({
      ...UiAnchor.center,
      sizeDelta: { x: 20, y: 20 },
    });

    expect(resolveRect(zeroParent, rectTransform)).toEqual({
      min: { x: -5, y: -5 },
      max: { x: 15, y: 15 },
    });
  });

  it('handles inverted anchors (anchorMin above anchorMax) as a negative-size stretch', () => {
    const rectTransform = buildRectTransform({
      anchorMin: { x: 1, y: 1 },
      anchorMax: { x: 0, y: 0 },
      pivot: { x: 0.5, y: 0.5 },
      sizeDelta: { x: 0, y: 0 },
    });

    // anchorRectSize is (-200,-100) here, so the resolved rect comes out
    // with max < min on both axes - `resolveRect` doesn't normalize this,
    // it faithfully reflects what an author-supplied inverted anchor means.
    expect(resolveRect(parentRect, rectTransform)).toEqual({
      min: { x: 100, y: 50 },
      max: { x: -100, y: -50 },
    });
  });

  it('does not mutate its inputs', () => {
    const rectTransform = buildRectTransform({
      ...UiAnchor.center,
      sizeDelta: { x: 40, y: 20 },
    });
    const parentRectClone: Rect = {
      min: { ...parentRect.min },
      max: { ...parentRect.max },
    };

    resolveRect(parentRectClone, rectTransform);

    expect(parentRectClone).toEqual(parentRect);
    expect(rectTransform.sizeDelta).toEqual({ x: 40, y: 20 });
  });
});
