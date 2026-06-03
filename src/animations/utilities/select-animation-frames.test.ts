import { describe, expect, it } from 'vitest';
import { selectAnimationFrames } from './select-animation-frames';
import { createSpriteSheet } from './create-sprite-sheet';

describe('selectAnimationFrames', () => {
  it('selects sequential frames across rows', () => {
    const sheet = createSpriteSheet({ width: 512, height: 512 }, 16, 16);

    const selected = selectAnimationFrames(sheet, 4);

    // expected positions: (0,0),(0,1),(0,2),(1,0)
    expect(selected).toHaveLength(4);
    expect(selected[0].offset.x).toBe(0);
    expect(selected[1].offset.x).toBe(0.0625);
    expect(selected[2].offset.x).toBe(0.125);
    expect(selected[3].offset.x).toBe(0.1875);
  });

  it('respects startFrame', () => {
    const sheet = createSpriteSheet({ width: 512, height: 512 }, 16, 16);

    const selected = selectAnimationFrames(sheet, 3, 2);

    // indices 2,3,4 -> (0,2),(1,0),(1,1)
    expect(selected).toHaveLength(3);
    expect(selected[0].offset.x).toBe(0.125);
    expect(selected[1].offset.x).toBe(0.1875);
    expect(selected[2].offset.x).toBe(0.25);
  });

  it('throws when requested frames exceed sprite sheet', () => {
    const sheet = createSpriteSheet({ width: 512, height: 512 }, 16, 16);

    expect(() => selectAnimationFrames(sheet, 10, 254)).toThrow(
      'Requested frame index 256 exceeds the total number of frames in the sprite sheet.',
    );
  });
});
