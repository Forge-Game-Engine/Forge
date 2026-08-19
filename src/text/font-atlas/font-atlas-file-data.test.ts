import { describe, expect, it } from 'vitest';
import {
  CURRENT_FONT_ATLAS_FORMAT_VERSION,
  getKerningPairKey,
} from './font-atlas-data.js';
import {
  type FontAtlasFileData,
  toFontAtlasData,
} from './font-atlas-file-data.js';

const buildFileData = (): FontAtlasFileData => ({
  formatVersion: CURRENT_FONT_ATLAS_FORMAT_VERSION,
  type: 'msdf',
  atlasImage: 'my-font.png',
  atlasSize: { width: 512, height: 512 },
  distanceRange: 4,
  metrics: { lineHeight: 1.2, ascender: 0.9, descender: -0.2, capHeight: 0.7 },
  glyphs: [
    {
      codePoint: 65,
      advance: 0.6,
      planeBounds: { left: 0.05, bottom: 0, right: 0.55, top: 0.7 },
      atlasBounds: { left: 0.1, bottom: 0.2, right: 0.2, top: 0.3 },
    },
    {
      codePoint: 32,
      advance: 0.3,
      planeBounds: null,
      atlasBounds: null,
    },
  ],
  kerning: {
    [getKerningPairKey(65, 86)]: -0.05,
  },
});

describe('toFontAtlasData', () => {
  it('should carry scalar fields over unchanged', () => {
    const result = toFontAtlasData(buildFileData());

    expect(result.formatVersion).toBe(CURRENT_FONT_ATLAS_FORMAT_VERSION);
    expect(result.type).toBe('msdf');
    expect(result.atlasImage).toBe('my-font.png');
    expect(result.atlasSize).toEqual({ width: 512, height: 512 });
    expect(result.distanceRange).toBe(4);
    expect(result.metrics).toEqual({
      lineHeight: 1.2,
      ascender: 0.9,
      descender: -0.2,
      capHeight: 0.7,
    });
  });

  it('should key glyphs by their code point', () => {
    const result = toFontAtlasData(buildFileData());

    expect(result.glyphs.size).toBe(2);
    expect(result.glyphs.get(65)).toEqual({
      codePoint: 65,
      advance: 0.6,
      planeBounds: { left: 0.05, bottom: 0, right: 0.55, top: 0.7 },
      atlasBounds: { left: 0.1, bottom: 0.2, right: 0.2, top: 0.3 },
    });
    expect(result.glyphs.get(32)?.planeBounds).toBeNull();
  });

  it('should convert kerning pairs into a Map', () => {
    const result = toFontAtlasData(buildFileData());

    expect(result.kerning.get(getKerningPairKey(65, 86))).toBeCloseTo(-0.05);
    expect(result.kerning.get(getKerningPairKey(86, 65))).toBeUndefined();
  });
});
