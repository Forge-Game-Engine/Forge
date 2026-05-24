import { describe, expect, it } from 'vitest';
import { createSpriteSheet } from './create-sprite-sheet';
import { Vector2 } from '../../math';

describe('createSpriteSheet', () => {
  it('calculates frames without border correctly', () => {
    const img = { width: 100, height: 100 } as unknown as HTMLImageElement;
    const sheet = createSpriteSheet(img, new Vector2(20, 20));
    const frames = sheet.frames;

    expect(frames.flat()).toHaveLength(25);

    const first = frames[0][0];
    expect(first.offset.x).toBe(0);
    expect(first.offset.y).toBe(0);
    expect(first.dimensions.x).toBe(0.2);
    expect(first.dimensions.y).toBe(0.2);

    const last = frames[frames.length - 1][frames[0].length - 1];
    expect(last.offset.x).toBe(0.8);
    expect(last.offset.y).toBe(0.8);
  });

  it('calculates frames with border correctly', () => {
    const img = { width: 50, height: 50 } as unknown as HTMLImageElement;
    const sheet = createSpriteSheet(img, new Vector2(20, 20), {
      borderInPixels: new Vector2(5, 5),
    });
    const frames = sheet.frames;

    expect(frames.flat()).toHaveLength(4);

    const first = frames[0][0];
    expect(first.offset.x).toBe(0.1);
    expect(first.offset.y).toBe(0.1);
    expect(first.dimensions.x).toBe(0.4);
    expect(first.dimensions.y).toBe(0.4);

    const second = frames[0][1];
    expect(second.offset.x).toBe(0.5);
    expect(second.offset.y).toBe(0.1);

    const third = frames[1][0];
    expect(third.offset.x).toBe(0.1);
    expect(third.offset.y).toBe(0.5);

    const fourth = frames[1][1];
    expect(fourth.offset.x).toBe(0.5);
    expect(fourth.offset.y).toBe(0.5);
  });

  it('floors non-integer dimensions', () => {
    const img = { width: 100, height: 100 } as unknown as HTMLImageElement;
    const sheet = createSpriteSheet(img, new Vector2(25, 33)); // width -> 100/3 = 33.333 -> floored 33
    const frames = sheet.frames;

    expect(frames[0][0].dimensions.x).toBe(0.25);
    expect(frames[0][0].dimensions.y).toBeCloseTo(0.33, 2);
  });

  it('calculates frames with gaps only correctly', () => {
    const img = { width: 100, height: 100 } as unknown as HTMLImageElement;
    const sheet = createSpriteSheet(img, new Vector2(20, 20), {
      gapInPixels: new Vector2(5, 5),
    });
    const frames = sheet.frames;

    // With a 5px gap and 20px nominal sprite size we get 4x4 sprites
    expect(frames.flat()).toHaveLength(16);

    const first = frames[0][0];
    expect(first.offset.x).toBe(0);
    expect(first.offset.y).toBe(0);
    expect(first.dimensions.x).toBeCloseTo(0.2125, 4);
    expect(first.dimensions.y).toBeCloseTo(0.2125, 4);

    const last = frames[frames.length - 1][frames[0].length - 1];
    expect(last.offset.x).toBeCloseTo(0.7875, 4);
    expect(last.offset.y).toBeCloseTo(0.7875, 4);
  });

  it('calculates frames with gaps and border correctly', () => {
    const img = { width: 50, height: 50 } as unknown as HTMLImageElement;
    const sheet = createSpriteSheet(img, new Vector2(15, 15), {
      borderInPixels: new Vector2(5, 5),
      gapInPixels: new Vector2(5, 5),
    });
    const frames = sheet.frames;

    // Expect 2x2 sprites given the chosen sizes
    expect(frames.flat()).toHaveLength(4);

    const first = frames[0][0];
    expect(first.offset.x).toBeCloseTo(0.1, 4);
    expect(first.offset.y).toBeCloseTo(0.1, 4);
    expect(first.dimensions.x).toBeCloseTo(0.35, 4);
    expect(first.dimensions.y).toBeCloseTo(0.35, 4);

    const second = frames[0][1];
    expect(second.offset.x).toBeCloseTo(0.55, 4);
    expect(second.offset.y).toBeCloseTo(0.1, 4);

    const third = frames[1][0];
    expect(third.offset.x).toBeCloseTo(0.1, 4);
    expect(third.offset.y).toBeCloseTo(0.55, 4);

    const fourth = frames[1][1];
    expect(fourth.offset.x).toBeCloseTo(0.55, 4);
    expect(fourth.offset.y).toBeCloseTo(0.55, 4);
  });
});
