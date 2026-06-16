import { describe, expect, it } from 'vitest';
import {
  BORDER_COLOR_OFFSET,
  BORDER_WIDTH_OFFSET,
  CLIP_RECT_OFFSET,
  CORNER_RADIUS_OFFSET,
  OPACITY_OFFSET,
  SIZE_OFFSET,
  TINT_OFFSET,
  UI_FLOATS_PER_INSTANCE,
  WORLD_MAT_0_OFFSET,
  WORLD_MAT_1_OFFSET,
  WORLD_MAT_2_OFFSET,
} from './ui-instance-layout';

describe('UI_FLOATS_PER_INSTANCE', () => {
  it('equals the sum of all field sizes in the instance layout', () => {
    const fieldSizes: Record<string, number> = {
      worldMat0: 3,
      worldMat1: 3,
      worldMat2: 3,
      size: 2,
      tint: 4,
      borderColor: 4,
      borderWidth: 1,
      cornerRadius: 1,
      opacity: 1,
      clipRect: 4,
    };

    const total = Object.values(fieldSizes).reduce((a, b) => a + b, 0);

    expect(total).toBe(UI_FLOATS_PER_INSTANCE);
  });

  it('has correct offsets that do not overlap', () => {
    const fields = [
      { name: 'worldMat0', offset: WORLD_MAT_0_OFFSET, size: 3 },
      { name: 'worldMat1', offset: WORLD_MAT_1_OFFSET, size: 3 },
      { name: 'worldMat2', offset: WORLD_MAT_2_OFFSET, size: 3 },
      { name: 'size', offset: SIZE_OFFSET, size: 2 },
      { name: 'tint', offset: TINT_OFFSET, size: 4 },
      { name: 'borderColor', offset: BORDER_COLOR_OFFSET, size: 4 },
      { name: 'borderWidth', offset: BORDER_WIDTH_OFFSET, size: 1 },
      { name: 'cornerRadius', offset: CORNER_RADIUS_OFFSET, size: 1 },
      { name: 'opacity', offset: OPACITY_OFFSET, size: 1 },
      { name: 'clipRect', offset: CLIP_RECT_OFFSET, size: 4 },
    ];

    // All offsets fit within the instance stride
    for (const field of fields) {
      expect(field.offset + field.size).toBeLessThanOrEqual(
        UI_FLOATS_PER_INSTANCE,
      );
    }

    // No two fields overlap
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const a = fields[i];
        const b = fields[j];
        const overlap =
          a.offset < b.offset + b.size && b.offset < a.offset + a.size;
        expect(overlap, `${a.name} overlaps ${b.name}`).toBe(false);
      }
    }
  });
});
