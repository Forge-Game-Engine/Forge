import { describe, expect, it } from 'vitest';
import {
  CURRENT_FONT_ATLAS_FORMAT_VERSION,
  getKerningPairKey,
} from './font-atlas-data.js';
import type { FontAtlasFileData } from './font-atlas-file-data.js';
import { validateFontAtlasFileData } from './validate-font-atlas-data.js';

const buildValidJson = (): FontAtlasFileData => ({
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

describe('validateFontAtlasFileData', () => {
  it('should return the data unchanged when it is valid', () => {
    const json = buildValidJson();

    expect(validateFontAtlasFileData(json, 'fixture.json')).toEqual(json);
  });

  it('should throw when the root value is not an object', () => {
    expect(() => validateFontAtlasFileData(null, 'fixture.json')).toThrow(
      /expected the root value to be a JSON object/,
    );
    expect(() => validateFontAtlasFileData('nope', 'fixture.json')).toThrow(
      /expected the root value to be a JSON object/,
    );
  });

  it('should throw a descriptive error when the format version is unsupported', () => {
    const json = { ...buildValidJson(), formatVersion: 999 };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /unsupported formatVersion "999"/,
    );
  });

  it('should throw when the type is not msdf', () => {
    const json = { ...buildValidJson(), type: 'mtsdf' };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /unsupported type "mtsdf"/,
    );
  });

  it('should throw when atlasImage is missing or empty', () => {
    const json = { ...buildValidJson(), atlasImage: '' };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /atlasImage must be a non-empty string/,
    );
  });

  it('should throw when atlasSize is non-positive', () => {
    const json = {
      ...buildValidJson(),
      atlasSize: { width: 0, height: 512 },
    };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /atlasSize.width and atlasSize.height must be positive finite numbers/,
    );
  });

  it('should throw when atlasSize is not an object', () => {
    const json = { ...buildValidJson(), atlasSize: null };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /atlasSize must be an object/,
    );
  });

  it('should throw when distanceRange is not finite', () => {
    const json = { ...buildValidJson(), distanceRange: Number.NaN };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /distanceRange must be a positive finite number/,
    );
  });

  it('should throw when metrics has a non-finite field', () => {
    const json = {
      ...buildValidJson(),
      metrics: {
        lineHeight: 1.2,
        ascender: Number.POSITIVE_INFINITY,
        descender: -0.2,
        capHeight: 0.7,
      },
    };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /metrics\.lineHeight, metrics\.ascender, metrics\.descender, and metrics\.capHeight must all be finite numbers/,
    );
  });

  it('should throw when metrics.capHeight is non-finite', () => {
    const json = {
      ...buildValidJson(),
      metrics: {
        lineHeight: 1.2,
        ascender: 0.9,
        descender: -0.2,
        capHeight: Number.NaN,
      },
    };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /metrics\.lineHeight, metrics\.ascender, metrics\.descender, and metrics\.capHeight must all be finite numbers/,
    );
  });

  it('should throw when metrics is not an object', () => {
    const json = { ...buildValidJson(), metrics: 'nope' };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /metrics must be an object/,
    );
  });

  it('should throw when glyphs is not an array', () => {
    const json = { ...buildValidJson(), glyphs: {} };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /glyphs must be an array/,
    );
  });

  it('should throw when glyphs has more entries than the sane maximum', () => {
    const json = {
      ...buildValidJson(),
      glyphs: Array.from({ length: 100_001 }, (_, index) => ({
        codePoint: index,
        advance: 0.5,
        planeBounds: null,
        atlasBounds: null,
      })),
    };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /glyphs has 100001 entries, exceeding the maximum of 100000/,
    );
  });

  it('should throw when a glyph is not an object', () => {
    const json = buildValidJson();
    json.glyphs[0] = null as never;

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /glyphs\[0\] must be an object/,
    );
  });

  it('should throw when a glyph has an invalid codePoint', () => {
    const json = buildValidJson();
    json.glyphs[0] = { ...json.glyphs[0], codePoint: -1 };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /glyphs\[0\]\.codePoint must be a non-negative integer/,
    );
  });

  it('should throw when a glyph has a non-finite advance', () => {
    const json = buildValidJson();
    json.glyphs[0] = { ...json.glyphs[0], advance: Number.NaN };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /glyphs\[0\]\.advance must be a finite number/,
    );
  });

  it('should throw when a glyph planeBounds is malformed', () => {
    const json = buildValidJson();
    json.glyphs[0] = {
      ...json.glyphs[0],
      planeBounds: { left: 0, bottom: 0, right: 0, top: Number.NaN },
    };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /glyphs\[0\]\.planeBounds's left, bottom, right, and top must all be finite numbers/,
    );
  });

  it('should throw when a glyph planeBounds is not an object or null', () => {
    const json = buildValidJson();
    json.glyphs[0] = { ...json.glyphs[0], planeBounds: 'nope' as never };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /glyphs\[0\]\.planeBounds must be a Rect or null/,
    );
  });

  it('should throw when kerning has more entries than the sane maximum', () => {
    const kerning: Record<string, number> = {};

    for (let index = 0; index < 1_000_001; index++) {
      kerning[getKerningPairKey(index, 0)] = 0;
    }

    const json = { ...buildValidJson(), kerning };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /kerning has 1000001 entries, exceeding the maximum of 1000000/,
    );
  });

  it('should throw when kerning is not an object', () => {
    const json = { ...buildValidJson(), kerning: 'nope' };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /kerning must be an object/,
    );
  });

  it('should throw when a kerning key is malformed', () => {
    const json = { ...buildValidJson(), kerning: { notAPair: 1 } };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /kerning key "notAPair" is not of the form/,
    );
  });

  it('should throw when a kerning value is not finite', () => {
    const json = {
      ...buildValidJson(),
      kerning: { [getKerningPairKey(65, 86)]: Number.NaN },
    };

    expect(() => validateFontAtlasFileData(json, 'fixture.json')).toThrow(
      /kerning\["65:86"\] must be a finite number/,
    );
  });

  it('should include the source path in error messages', () => {
    expect(() =>
      validateFontAtlasFileData(null, 'assets/fonts/broken.json'),
    ).toThrow(/Invalid font atlas JSON at "assets\/fonts\/broken\.json"/);
  });
});
