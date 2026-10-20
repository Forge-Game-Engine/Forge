/* eslint-disable @typescript-eslint/naming-convention */
import { describe, expect, it } from 'vitest';
import { parseTexturePackerAtlas } from './parse-texture-packer-atlas.js';

type Json = Record<string, unknown>;

const trimmedFrame = (overrides: Json = {}): Json => ({
  frame: { x: 2, y: 2, w: 20, h: 30 },
  rotated: false,
  trimmed: true,
  spriteSourceSize: { x: 6, y: 2, w: 20, h: 30 },
  sourceSize: { w: 32, h: 32 },
  pivot: { x: 0.5, y: 1 },
  ...overrides,
});

const untrimmedFrame = (overrides: Json = {}): Json => ({
  frame: { x: 32, y: 0, w: 16, h: 16 },
  rotated: false,
  trimmed: false,
  spriteSourceSize: { x: 0, y: 0, w: 16, h: 16 },
  sourceSize: { w: 16, h: 16 },
  ...overrides,
});

const meta = (overrides: Json = {}): Json => ({
  app: 'https://www.codeandweb.com/texturepacker',
  image: 'hero.png',
  format: 'RGBA8888',
  size: { w: 64, h: 32 },
  scale: '1',
  smartupdate: '$TexturePacker:SmartUpdate:abc$',
  ...overrides,
});

/** A TexturePacker "JSON (Hash)" file. */
const hashJson = (frames: Json = {}, metaOverrides: Json = {}): Json => ({
  frames: {
    hero_idle_0: trimmedFrame(),
    coin: untrimmedFrame(),
    ...frames,
  },
  meta: meta(metaOverrides),
});

/** A TexturePacker "JSON (Array)" file. */
const arrayJson = (frames?: unknown[], metaOverrides: Json = {}): Json => ({
  frames: frames ?? [
    { filename: 'hero_idle_0', ...trimmedFrame() },
    { filename: 'coin', ...untrimmedFrame() },
  ],
  meta: meta(metaOverrides),
});

const expectedHero = {
  name: 'hero_idle_0',
  x: 2,
  y: 2,
  width: 20,
  height: 30,
  sourceWidth: 32,
  sourceHeight: 32,
  trimX: 6,
  trimY: 2,
  pivot: { x: 0.5, y: 1 },
};

const expectedCoin = { name: 'coin', x: 32, y: 0, width: 16, height: 16 };

const expectInvalid = (json: unknown, message: string): void => {
  expect(() => parseTexturePackerAtlas(json)).toThrow(
    `Invalid TexturePacker atlas JSON: ${message}`,
  );
};

describe('parseTexturePackerAtlas', () => {
  describe('reading frames', () => {
    it('reads a JSON (Hash) file, keyed by name', () => {
      const data = parseTexturePackerAtlas(hashJson());

      expect(data.regions).toEqual([expectedHero, expectedCoin]);
    });

    it("reads a JSON (Array) file, named by filename, in the file's order", () => {
      const data = parseTexturePackerAtlas(
        arrayJson([
          { filename: 'coin', ...untrimmedFrame() },
          { filename: 'hero_idle_0', ...trimmedFrame() },
        ]),
      );

      expect(data.regions).toEqual([expectedCoin, expectedHero]);
    });

    it("reads the image's size and name from meta", () => {
      const data = parseTexturePackerAtlas(hashJson());

      expect(data.size).toEqual({ width: 64, height: 32 });
      expect(data.imageName).toBe('hero.png');
    });

    it('gives a null imageName when meta has no image', () => {
      const json = hashJson();

      delete (json['meta'] as Json)['image'];

      expect(parseTexturePackerAtlas(json).imageName).toBeNull();
    });

    it("ignores a trimmed: false frame's trim fields", () => {
      const data = parseTexturePackerAtlas(
        hashJson({
          coin: untrimmedFrame({
            spriteSourceSize: { x: 4, y: 4, w: 16, h: 16 },
            sourceSize: { w: 40, h: 40 },
          }),
        }),
      );

      expect(data.regions[1]).toEqual(expectedCoin);
    });

    it('reads a frame without trim fields as untrimmed', () => {
      const data = parseTexturePackerAtlas(
        hashJson({ coin: { frame: { x: 32, y: 0, w: 16, h: 16 } } }),
      );

      expect(data.regions[1]).toEqual(expectedCoin);
    });

    it('reads the trim of a frame that leaves out trimmed', () => {
      const frame = trimmedFrame();

      delete frame['trimmed'];

      const data = parseTexturePackerAtlas(hashJson({ hero_idle_0: frame }));

      expect(data.regions[0]).toEqual(expectedHero);
    });

    it('copies a pivot as it is, without flipping its Y', () => {
      const data = parseTexturePackerAtlas(
        hashJson({ hero_idle_0: trimmedFrame({ pivot: { x: 0.25, y: 0.9 } }) }),
      );

      expect(data.regions[0].pivot).toEqual({ x: 0.25, y: 0.9 });
    });

    it('leaves the pivot out when the frame has none', () => {
      const data = parseTexturePackerAtlas(hashJson());

      expect(data.regions[1]).not.toHaveProperty('pivot');
    });

    it('ignores fields it does not read, as Aseprite and other tools write them', () => {
      const data = parseTexturePackerAtlas({
        frames: [
          {
            filename: 'hero 0.aseprite',
            frame: { x: 0, y: 0, w: 32, h: 32 },
            rotated: false,
            trimmed: false,
            spriteSourceSize: { x: 0, y: 0, w: 32, h: 32 },
            sourceSize: { w: 32, h: 32 },
            duration: 100,
          },
        ],
        meta: {
          app: 'https://www.aseprite.org/',
          version: '1.3',
          image: 'hero.png',
          format: 'RGBA8888',
          size: { w: 32, h: 32 },
          scale: '1',
          frameTags: [{ name: 'idle', from: 0, to: 0 }],
          layers: [],
          slices: [],
        },
        animations: { idle: ['hero 0.aseprite'] },
      });

      expect(data.regions).toEqual([
        { name: 'hero 0.aseprite', x: 0, y: 0, width: 32, height: 32 },
      ]);
    });

    it('keeps a frame named __proto__ as a region of that name', () => {
      const json: unknown = JSON.parse(
        '{"frames":{"__proto__":{"frame":{"x":0,"y":0,"w":8,"h":8}}},"meta":{"size":{"w":8,"h":8}}}',
      );

      expect(parseTexturePackerAtlas(json).regions).toEqual([
        { name: '__proto__', x: 0, y: 0, width: 8, height: 8 },
      ]);
    });

    it('freezes the result, its regions and their pivots', () => {
      const data = parseTexturePackerAtlas(hashJson());

      expect(Object.isFrozen(data)).toBe(true);
      expect(Object.isFrozen(data.size)).toBe(true);
      expect(Object.isFrozen(data.regions)).toBe(true);
      expect(Object.isFrozen(data.regions[0])).toBe(true);
      expect(Object.isFrozen(data.regions[0].pivot)).toBe(true);
    });
  });

  describe('reading meta.scale', () => {
    it.each([
      { scale: '2', expected: 2 },
      { scale: 2, expected: 2 },
      { scale: '0.5', expected: 0.5 },
      { scale: 1, expected: 1 },
    ])('reads $scale as $expected', ({ scale, expected }) => {
      expect(parseTexturePackerAtlas(hashJson({}, { scale })).scale).toBe(
        expected,
      );
    });

    it('defaults to 1 when meta has no scale', () => {
      const json = hashJson();

      delete (json['meta'] as Json)['scale'];

      expect(parseTexturePackerAtlas(json).scale).toBe(1);
    });

    it.each(['', '2x', '0', -1, 0, true, Number.POSITIVE_INFINITY])(
      'throws for a scale of %s',
      (scale) => {
        expect(() => parseTexturePackerAtlas(hashJson({}, { scale }))).toThrow(
          'Invalid TexturePacker atlas JSON: meta.scale must be a number above 0, or a string holding one',
        );
      },
    );
  });

  describe('rejecting invalid files', () => {
    it.each([null, 'atlas', [], 3])('throws for a root of %s', (json) => {
      expectInvalid(json, 'the root must be an object');
    });

    it('throws when frames is missing', () => {
      expectInvalid(
        { meta: meta() },
        'frames must be an object (JSON (Hash)) or an array (JSON (Array)), got nothing.',
      );
    });

    it('throws for a multi-page file, saying how to export it', () => {
      expectInvalid(
        { textures: [{ image: 'a.png', frames: [] }], meta: meta() },
        'it has a textures list instead of frames, so it describes a multi-page atlas.',
      );
    });

    it.each([{ frames: {} }, { frames: [] }])(
      'throws for empty frames ($frames)',
      ({ frames }) => {
        expectInvalid({ frames, meta: meta() }, 'frames is empty.');
      },
    );

    it('throws for more than 100 000 frames', () => {
      const frames = Array.from({ length: 100_001 }, () => ({}));

      expectInvalid(
        { frames, meta: meta() },
        'frames has 100001 frames, more than the 100000 an atlas may have.',
      );
    });

    it('throws when meta is missing', () => {
      expectInvalid(
        { frames: { coin: untrimmedFrame() } },
        'meta must be an object, got nothing.',
      );
    });

    it('throws when meta.size is missing', () => {
      expectInvalid(
        hashJson({}, { size: undefined }),
        'meta.size must be an object, got nothing.',
      );
    });

    it('throws for a meta.size that is not a whole number above 0', () => {
      expectInvalid(
        hashJson({}, { size: { w: 0, h: 32 } }),
        'meta.size.w must be a whole number of texels above 0, got 0.',
      );
    });

    it('throws for a meta.image that is not a string', () => {
      expectInvalid(
        hashJson({}, { image: 3 }),
        'meta.image must be a string, got 3.',
      );
    });

    it('throws for a frame that is not an object', () => {
      expectInvalid(
        hashJson({ coin: 'coin.png' }),
        'frames["coin"] must be an object, got "coin.png".',
      );
    });

    it('throws for a frame without a frame rect', () => {
      expectInvalid(
        hashJson({ coin: { rotated: false } }),
        'frames["coin"].frame must be an object, got nothing.',
      );
    });

    it('throws for a frame rect value that is not a whole number', () => {
      expectInvalid(
        hashJson({
          hero_idle_0: trimmedFrame({ frame: { x: 2, y: 2, w: 12.5, h: 30 } }),
        }),
        'frames["hero_idle_0"].frame.w must be a whole number of texels above 0, got 12.5.',
      );
    });

    it('throws for a negative frame position', () => {
      expectInvalid(
        hashJson({
          coin: untrimmedFrame({ frame: { x: -1, y: 0, w: 16, h: 16 } }),
        }),
        'frames["coin"].frame.x must be a whole number of texels of at least 0, got -1.',
      );
    });

    it('throws for a frame size of 0', () => {
      expectInvalid(
        hashJson({
          coin: untrimmedFrame({ frame: { x: 0, y: 0, w: 16, h: 0 } }),
        }),
        'frames["coin"].frame.h must be a whole number of texels above 0, got 0.',
      );
    });

    it('throws for a frame value given as a string', () => {
      expectInvalid(
        hashJson({
          coin: untrimmedFrame({ frame: { x: '0', y: 0, w: 16, h: 16 } }),
        }),
        'frames["coin"].frame.x must be a whole number of texels of at least 0, got "0".',
      );
    });

    it('throws for a frame that reaches past meta.size', () => {
      expectInvalid(
        hashJson({
          coin: untrimmedFrame({ frame: { x: 60, y: 0, w: 8, h: 8 } }),
        }),
        'frames["coin"].frame (x 60, w 8) reaches past meta.size.w of 64 texels.',
      );
      expectInvalid(
        hashJson({
          coin: untrimmedFrame({ frame: { x: 0, y: 30, w: 8, h: 8 } }),
        }),
        'frames["coin"].frame (y 30, h 8) reaches past meta.size.h of 32 texels.',
      );
    });

    it('throws for a rotated frame, saying how to turn rotation off', () => {
      expectInvalid(
        hashJson({ hero_idle_0: trimmedFrame({ rotated: true }) }),
        'frames["hero_idle_0"] is rotated. Forge doesn\'t draw rotated frames; turn off rotation in the packer ("Allow rotation" in TexturePacker and free-tex-packer) and export again.',
      );
    });

    it.each(['rotated', 'trimmed'])(
      'throws for a %s that is not a boolean',
      (field) => {
        expectInvalid(
          hashJson({ coin: untrimmedFrame({ [field]: 'false' }) }),
          `frames["coin"].${field} must be true or false, got "false".`,
        );
      },
    );

    it("throws for a spriteSourceSize whose size doesn't match frame", () => {
      expectInvalid(
        arrayJson([
          { filename: 'coin', ...untrimmedFrame() },
          {
            filename: 'hero_run_2',
            ...trimmedFrame({
              spriteSourceSize: { x: 6, y: 2, w: 18, h: 30 },
            }),
          },
        ]),
        'frames[1] ("hero_run_2").spriteSourceSize.w (18) doesn\'t match frame.w (20).',
      );
    });

    it('throws for a trimmed frame with only one of its trim fields', () => {
      const withoutSourceSize = trimmedFrame();
      const withoutSpriteSourceSize = trimmedFrame();

      delete withoutSourceSize['sourceSize'];
      delete withoutSpriteSourceSize['spriteSourceSize'];

      expectInvalid(
        hashJson({ hero_idle_0: withoutSourceSize }),
        'frames["hero_idle_0"] has a spriteSourceSize but no sourceSize.',
      );
      expectInvalid(
        hashJson({ hero_idle_0: withoutSpriteSourceSize }),
        'frames["hero_idle_0"] has a sourceSize but no spriteSourceSize.',
      );
    });

    it("throws for a trim that doesn't fit inside sourceSize", () => {
      expectInvalid(
        hashJson({
          hero_idle_0: trimmedFrame({ sourceSize: { w: 24, h: 32 } }),
        }),
        'frames["hero_idle_0"].spriteSourceSize (x 6, w 20) reaches past sourceSize.w of 24 texels.',
      );
    });

    it('throws for a negative trim', () => {
      expectInvalid(
        hashJson({
          hero_idle_0: trimmedFrame({
            spriteSourceSize: { x: 6, y: -2, w: 20, h: 30 },
          }),
        }),
        'frames["hero_idle_0"].spriteSourceSize.y must be a whole number of texels of at least 0, got -2.',
      );
    });

    it('throws for a pivot value that is not a finite number', () => {
      expectInvalid(
        hashJson({ hero_idle_0: trimmedFrame({ pivot: { x: 0.5, y: '1' } }) }),
        'frames["hero_idle_0"].pivot.y must be a finite number, got "1".',
      );
    });

    it('throws for an empty name', () => {
      expectInvalid(
        hashJson({ '': untrimmedFrame() }),
        'frames has a frame with an empty name.',
      );
      expectInvalid(
        arrayJson([{ filename: '', ...untrimmedFrame() }]),
        'frames[0].filename must be a non-empty string, got "".',
      );
    });

    it('throws for an array frame without a filename', () => {
      expectInvalid(
        arrayJson([untrimmedFrame()]),
        'frames[0].filename must be a non-empty string, got nothing.',
      );
    });

    it('throws for two array frames with the same filename', () => {
      expectInvalid(
        arrayJson([
          { filename: 'coin', ...untrimmedFrame() },
          { filename: 'hero_idle_0', ...trimmedFrame() },
          { filename: 'coin', ...untrimmedFrame() },
        ]),
        'frames[2] ("coin") has the same filename as frames[0]. Frame names must be unique.',
      );
    });
  });
});
