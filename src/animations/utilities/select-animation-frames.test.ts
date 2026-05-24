import { describe, expect, it } from 'vitest';
import { selectAnimationFrames } from './select-animation-frames';
import { Vector2 } from '../../math';

function makeSheet(rows: number, cols: number) {
  const frames = new Array(rows).fill(null).map((_, r) =>
    new Array(cols).fill(null).map((_, c) => ({
      offset: new Vector2(r * 10 + c, 0),
      dimensions: new Vector2(1, 1),
    })),
  );

  return { frames };
}

describe('selectAnimationFrames', () => {
  it('selects sequential frames across rows', () => {
    const sheet = makeSheet(2, 3); // 2 rows x 3 cols

    const selected = selectAnimationFrames(sheet, 4); // indices 0..3

    // expected positions: (0,0),(0,1),(0,2),(1,0)
    expect(selected).toHaveLength(4);
    expect(selected[0].offset.x).toBe(0);
    expect(selected[1].offset.x).toBe(1);
    expect(selected[2].offset.x).toBe(2);
    expect(selected[3].offset.x).toBe(10);
  });

  it('respects startFrame', () => {
    const sheet = makeSheet(3, 3);

    const selected = selectAnimationFrames(sheet, 3, 2);

    // indices 2,3,4 -> (0,2),(1,0),(1,1)
    expect(selected).toHaveLength(3);
    expect(selected[0].offset.x).toBe(2);
    expect(selected[1].offset.x).toBe(10);
    expect(selected[2].offset.x).toBe(11);
  });

  it('honors an explicit rowWidth', () => {
    const sheet = makeSheet(3, 3);

    // force rowWidth to 2 so indexing wraps after 2 columns
    const selected = selectAnimationFrames(sheet, 4, 0, 2);

    // with rowWidth=2, indices 0..3 map to: (0,0),(0,1),(1,0),(1,1)
    expect(selected).toHaveLength(4);
    expect(selected[0].offset.x).toBe(0);
    expect(selected[1].offset.x).toBe(1);
    expect(selected[2].offset.x).toBe(10);
    expect(selected[3].offset.x).toBe(11);
  });

  it('throws when requested frames exceed sprite sheet', () => {
    const sheet = makeSheet(2, 2);

    // total frames = 4; request starting at 3 for 2 frames => index 4 is out of bounds
    expect(() => selectAnimationFrames(sheet, 2, 3)).toThrow(
      /Requested frame index 4 exceeds the total number of frames in the sprite sheet\./,
    );
  });
});
