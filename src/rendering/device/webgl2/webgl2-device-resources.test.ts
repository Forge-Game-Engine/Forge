import { beforeEach, describe, expect, it } from 'vitest';
import {
  createRecordingRenderContext,
  RecordingGl,
} from '../../test-helpers/recording-gl.js';
import type { GpuDevice } from '../gpu-device.js';
import { createTexture } from '../../texture.js';
import * as glc from './gl-constants.js';
import { textureFormats } from './texture-formats.js';

const uploadPixelStorage = new Map([
  [glc.GL_UNPACK_FLIP_Y_WEBGL, 0],
  [glc.GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0],
  [glc.GL_UNPACK_ALIGNMENT, 1],
  [glc.GL_UNPACK_COLORSPACE_CONVERSION_WEBGL, glc.GL_NONE],
]);

const defaultPixelStorage = new Map([
  [glc.GL_UNPACK_FLIP_Y_WEBGL, 0],
  [glc.GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0],
  [glc.GL_UNPACK_ALIGNMENT, 4],
  [glc.GL_UNPACK_COLORSPACE_CONVERSION_WEBGL, glc.GL_BROWSER_DEFAULT_WEBGL],
]);

describe('the WebGL2 GPU device', () => {
  let recording: RecordingGl;
  let device: GpuDevice;

  /**
   * The pixel storage WebGL has when a call is made: the defaults, changed
   * by every `pixelStorei` before it.
   */
  const pixelStorageAt = (
    name: string,
    index: number = recording.calls.findIndex((call) => call.name === name),
  ): Map<number, unknown> => {
    const storage = new Map<number, unknown>(defaultPixelStorage);

    expect(recording.calls[index]?.name).toBe(name);

    for (const call of recording.calls.slice(0, index)) {
      if (call.name === 'pixelStorei') {
        storage.set(call.args[0] as number, call.args[1]);
      }
    }

    return storage;
  };

  beforeEach(() => {
    const context = createRecordingRenderContext();

    recording = context.recording;
    device = context.renderContext.device;
  });

  describe('capabilities', () => {
    it('is created once, when first read, and reads its capabilities then', () => {
      const context = createRecordingRenderContext();

      expect(
        context.recording.callsTo('getInternalformatParameter'),
      ).toHaveLength(0);

      const first = context.renderContext.device;
      const reads = context.recording.callsTo(
        'getInternalformatParameter',
      ).length;

      expect(context.renderContext.device).toBe(first);
      expect(reads).toBeGreaterThan(0);
      expect(
        context.recording.callsTo('getInternalformatParameter'),
      ).toHaveLength(reads);
    });

    it('reports extensions, limits and sample counts', () => {
      const { capabilities } = device;

      expect(capabilities.colorBufferFloat).toBe(true);
      expect(capabilities.colorBufferHalfFloat).toBe(true);
      expect(capabilities.floatTextureLinearFiltering).toBe(true);
      expect(capabilities.maxAnisotropy).toBe(16);
      expect(capabilities.textureCompression.astc).toBe(false);
      expect(capabilities.independentBlend).toBe(false);
      expect(capabilities.limits.maxTextureImageUnits).toBe(16);
      expect(capabilities.limits.uniformBufferOffsetAlignment).toBe(256);
      expect(capabilities.getSampleCounts('rgba8unorm')).toEqual([4, 2]);
      expect(capabilities.getSampleCounts('bc1-rgba-unorm')).toEqual([]);
    });

    it('treats float formats as not renderable without a float color buffer extension', () => {
      const { renderContext } = createRecordingRenderContext({
        extensions: [],
      });
      const bare = renderContext.device;

      expect(bare.capabilities.colorBufferHalfFloat).toBe(false);
      expect(bare.capabilities.maxAnisotropy).toBe(1);
      expect(() =>
        bare.createTexture({
          format: 'rgba16float',
          size: { width: 4, height: 4 },
          usage: ['render-attachment'],
        }),
      ).toThrow(/can't be rendered to/);
    });

    it('accepts half-float color buffers from EXT_color_buffer_half_float', () => {
      const { renderContext } = createRecordingRenderContext({
        extensions: ['EXT_color_buffer_half_float'],
      });

      expect(renderContext.device.capabilities.colorBufferFloat).toBe(false);
      expect(renderContext.device.capabilities.colorBufferHalfFloat).toBe(true);
    });
  });

  describe('buffers', () => {
    it('creates a buffer with its initial contents and writes into it', () => {
      const buffer = device.createBuffer({
        usage: 'vertex',
        size: 16,
        data: new Float32Array([1, 2]),
      });
      const write = new Float32Array([3]);
      const [data] = recording.callsTo('bufferData');

      expect(data.args[0]).toBe(glc.GL_ARRAY_BUFFER);
      expect([
        ...new Float32Array((data.args[1] as Uint8Array).slice().buffer),
      ]).toEqual([1, 2, 0, 0]);

      buffer.write(8, write);

      expect(recording.callsTo('bufferSubData')[0].args).toEqual([
        glc.GL_ARRAY_BUFFER,
        8,
        write,
      ]);
    });

    it('uploads an index buffer with the default vertex array bound', () => {
      device.createBuffer({ usage: 'index', size: 8 });

      const names = recording.calls.map((call) => call.name);
      const bindVertexArray = names.indexOf('bindVertexArray');
      const bindBuffer = recording.calls.findIndex(
        (call) =>
          call.name === 'bindBuffer' &&
          call.args[0] === glc.GL_ELEMENT_ARRAY_BUFFER,
      );

      expect(recording.calls[bindVertexArray].args).toEqual([null]);
      expect(bindVertexArray).toBeLessThan(bindBuffer);
    });

    it('rejects sizes and writes that are unaligned or out of range', () => {
      expect(() => device.createBuffer({ usage: 'uniform', size: 6 })).toThrow(
        /multiple of 4/,
      );
      expect(() => device.createBuffer({ usage: 'uniform', size: 0 })).toThrow(
        /positive/,
      );

      const buffer = device.createBuffer({ usage: 'uniform', size: 16 });

      expect(() => {
        buffer.write(2, new Uint8Array(4));
      }).toThrow(/multiple of 4/);
      expect(() => {
        buffer.write(12, new Uint8Array(8));
      }).toThrow(/doesn't fit/);
    });

    it('throws when a destroyed buffer is written', () => {
      const buffer = device.createBuffer({ usage: 'vertex', size: 4 });

      buffer.destroy();
      buffer.destroy();

      expect(recording.callsTo('deleteBuffer')).toHaveLength(1);
      expect(() => {
        buffer.write(0, new Uint8Array(4));
      }).toThrow(/destroyed/);
    });
  });

  describe('staging buffers', () => {
    it('aligns uniform allocations to the uniform buffer offset alignment', () => {
      const staging = device.createStagingBuffer({ usage: 'uniform' });

      expect(staging.allocate(64)).toBe(0);
      expect(staging.allocate(16)).toBe(256);
      expect(staging.allocate(4)).toBe(512);
      expect(staging.allocatedSize).toBe(516);
      expect(staging.float32.length * 4).toBeGreaterThanOrEqual(516);

      staging.reset();

      expect(staging.allocate(4)).toBe(0);
    });

    it('keeps its contents when it grows', () => {
      const staging = device.createStagingBuffer({ usage: 'vertex' });
      const first = staging.allocate(4);

      staging.float32[first / 4] = 7;
      staging.allocate(4096);

      expect(staging.float32[first / 4]).toBe(7);
    });

    it('uploads the changed range once, before a pass', () => {
      const staging = device.createStagingBuffer({ usage: 'vertex' });
      const target = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 4, height: 4 },
        usage: ['render-attachment'],
      });
      const offset = staging.allocate(8);

      staging.float32.set([1, 2], offset / 4);
      staging.markDirty(offset, 8);
      recording.clearCalls();

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: target, loadOp: 'load', storeOp: 'store' }],
      });

      pass.end();
      encoder
        .beginRenderPass({
          colorAttachments: [
            { view: target, loadOp: 'load', storeOp: 'store' },
          ],
        })
        .end();

      const uploads = recording.callsTo('bufferSubData');

      expect(uploads).toHaveLength(1);
      expect(uploads[0].args[1]).toBe(0);
      expect((uploads[0].args[2] as Uint8Array).byteLength).toBe(8);
    });
  });

  describe('textures', () => {
    const availableFormats = [...textureFormats.values()]
      .filter((info) => info.compression === null)
      .map((info) => info.name);

    it.each(availableFormats)('creates immutable storage for %s', (format) => {
      const info = textureFormats.get(format);

      recording.clearCalls();
      device.createTexture({
        format: format,
        size: { width: 8, height: 4 },
        usage: ['sampled', 'copy-destination'],
      });

      expect(recording.callsTo('texStorage2D')[0].args).toEqual([
        glc.GL_TEXTURE_2D,
        1,
        info?.internalFormat,
        8,
        4,
      ]);
    });

    it('creates a full mip chain, cube, array and 3D textures', () => {
      const full = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 16, height: 4 },
        mipLevelCount: 'full',
        usage: ['sampled'],
      });

      device.createTexture({
        dimension: 'cube',
        format: 'rgba16float',
        size: { width: 8, height: 8, depthOrArrayLayers: 6 },
        usage: ['sampled'],
      });
      device.createTexture({
        dimension: '2d-array',
        format: 'depth32float',
        size: { width: 8, height: 8, depthOrArrayLayers: 3 },
        usage: ['sampled', 'render-attachment'],
      });
      device.createTexture({
        dimension: '3d',
        format: 'r8unorm',
        size: { width: 8, height: 8, depthOrArrayLayers: 8 },
        mipLevelCount: 'full',
        usage: ['sampled'],
      });

      expect(full.mipLevelCount).toBe(5);
      expect(recording.callsTo('texStorage2D')[1].args[0]).toBe(
        glc.GL_TEXTURE_CUBE_MAP,
      );
      expect(
        recording.callsTo('texStorage3D').map((call) => call.args[0]),
      ).toEqual([glc.GL_TEXTURE_2D_ARRAY, glc.GL_TEXTURE_3D]);
      expect(recording.callsTo('texStorage3D')[1].args[1]).toBe(4);
    });

    it("rejects shapes that don't fit their dimension or the device", () => {
      const cases = [
        {
          dimension: 'cube',
          size: { width: 8, height: 4, depthOrArrayLayers: 6 },
        },
        {
          dimension: '2d',
          size: { width: 8, height: 8, depthOrArrayLayers: 2 },
        },
        { dimension: '2d', size: { width: 8192, height: 8 } },
        {
          dimension: '3d',
          size: { width: 8, height: 8, depthOrArrayLayers: 8 },
          format: 'depth24plus',
        },
      ] as const;

      for (const descriptor of cases) {
        expect(() =>
          device.createTexture({
            format: 'rgba8unorm',
            usage: ['sampled'],
            ...descriptor,
          }),
        ).toThrow(/doesn't fit/);
      }

      expect(() =>
        device.createTexture({
          format: 'rgba8unorm',
          size: { width: 8, height: 8 },
          mipLevelCount: 5,
          usage: ['sampled'],
        }),
      ).toThrow(/1 to 4 mip levels/);
    });

    it('needs an extension for compressed formats, and whole blocks', () => {
      expect(() =>
        device.createTexture({
          format: 'bc1-rgba-unorm',
          size: { width: 8, height: 8 },
          usage: ['sampled'],
        }),
      ).toThrow(/no extension/);

      const { renderContext, recording: compressed } =
        createRecordingRenderContext({
          extensions: [
            'WEBGL_compressed_texture_s3tc',
            'WEBGL_compressed_texture_astc',
          ],
        });
      const texture = renderContext.device.createTexture({
        format: 'astc-6x6-unorm-srgb',
        size: { width: 12, height: 6 },
        usage: ['sampled', 'copy-destination'],
      });

      texture.write(new Uint8Array(32));

      expect(compressed.callsTo('texStorage2D')[0].args[2]).toBe(0x93d4);
      expect(
        compressed.callsTo('compressedTexSubImage2D')[0].args.slice(0, 7),
      ).toEqual([glc.GL_TEXTURE_2D, 0, 0, 0, 12, 6, 0x93d4]);
      expect(() =>
        renderContext.device.createTexture({
          format: 'bc1-rgba-unorm',
          size: { width: 6, height: 8 },
          usage: ['sampled'],
        }),
      ).toThrow(/multiple of/);
    });

    it('writes with explicit pixel storage, so the browser never changes texels', () => {
      const texture = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 2, height: 2 },
        usage: ['sampled', 'copy-destination'],
      });

      texture.write(new Uint8Array(16));

      expect(pixelStorageAt('texSubImage2D')).toEqual(uploadPixelStorage);
      expect(recording.state.pixelStorage).toEqual(defaultPixelStorage);
      expect(recording.callsTo('texSubImage2D')[0].args.slice(0, 8)).toEqual([
        glc.GL_TEXTURE_2D,
        0,
        0,
        0,
        2,
        2,
        glc.GL_RGBA,
        glc.GL_UNSIGNED_BYTE,
      ]);
    });

    it("leaves WebGL's default pixel storage for the engine's 2D textures, before and after a restore", () => {
      const context = createRecordingRenderContext();
      const texture = context.renderContext.device.createTexture({
        format: 'rgba8unorm',
        size: { width: 1, height: 1 },
        usage: ['sampled', 'copy-destination'],
      });

      texture.write(new Uint8Array(4));
      recording = context.recording;
      createTexture(context.renderContext, document.createElement('canvas'));

      expect(pixelStorageAt('texImage2D')).toEqual(defaultPixelStorage);

      context.loseContext();
      context.recording.clearCalls();
      context.restoreContext();

      const restoredUpload = context.recording.calls.findLastIndex(
        (call) => call.name === 'texImage2D',
      );

      expect(pixelStorageAt('texImage2D', restoredUpload)).toEqual(
        defaultPixelStorage,
      );
      expect(pixelStorageAt('texSubImage2D')).toEqual(uploadPixelStorage);
    });

    it('uploads a typed array to each cube face it covers', () => {
      const cube = device.createTexture({
        dimension: 'cube',
        format: 'rgba8unorm',
        size: { width: 2, height: 2, depthOrArrayLayers: 6 },
        usage: ['sampled', 'copy-destination'],
      });

      cube.write(new Uint8Array(16 * 2), {
        layer: 2,
        size: { width: 2, height: 2, depthOrArrayLayers: 2 },
      });

      expect(
        recording.callsTo('texSubImage2D').map((call) => call.args[0]),
      ).toEqual([
        glc.GL_TEXTURE_CUBE_MAP_POSITIVE_X + 2,
        glc.GL_TEXTURE_CUBE_MAP_POSITIVE_X + 3,
      ]);
    });

    it('accepts a Float32Array for a half-float format, and rejects the wrong array type', () => {
      const texture = device.createTexture({
        format: 'rgba16float',
        size: { width: 1, height: 1 },
        usage: ['copy-destination', 'sampled'],
      });

      texture.write(new Float32Array(4));
      texture.write(new Uint16Array(4));

      expect(
        recording.callsTo('texSubImage2D').map((call) => call.args[7]),
      ).toEqual([glc.GL_FLOAT, glc.GL_HALF_FLOAT]);
      expect(() => {
        texture.write(new Uint8Array(8));
      }).toThrow(/Uint16Array/);
    });

    it("rejects writes that don't fit, or to a texture that can't be written", () => {
      const texture = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 4, height: 4 },
        mipLevelCount: 2,
        usage: ['sampled', 'copy-destination'],
      });

      expect(() => {
        texture.write(new Uint8Array(64), {
          mipLevel: 1,
          size: { width: 4, height: 4 },
        });
      }).toThrow(/doesn't fit/);
      expect(() => {
        texture.write(new Uint8Array(4), { size: { width: 2, height: 2 } });
      }).toThrow(/needs 16 bytes/);

      const sampledOnly = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 4, height: 4 },
        usage: ['sampled'],
      });

      expect(() => {
        sampledOnly.write(new Uint8Array(64));
      }).toThrow(/copy-destination/);
    });

    it('generates mipmaps only for formats that can be rendered to and filtered', () => {
      const texture = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 4, height: 4 },
        mipLevelCount: 'full',
        usage: ['sampled'],
      });
      const integer = device.createTexture({
        format: 'r32uint',
        size: { width: 4, height: 4 },
        mipLevelCount: 'full',
        usage: ['sampled'],
      });

      texture.generateMipmaps();

      expect(recording.callsTo('generateMipmap')[0].args).toEqual([
        glc.GL_TEXTURE_2D,
      ]);
      expect(() => {
        integer.generateMipmaps();
      }).toThrow(/rendered to and filtered/);
    });

    it("makes a multisampled texture a renderbuffer, clamped to the format's sample counts", () => {
      const texture = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 4, height: 4 },
        sampleCount: 8,
        usage: ['render-attachment'],
      });

      expect(texture.sampleCount).toBe(4);
      expect(
        recording.callsTo('renderbufferStorageMultisample')[0].args,
      ).toEqual([glc.GL_RENDERBUFFER, 4, glc.GL_RGBA8, 4, 4]);
      expect(() =>
        device.createTexture({
          format: 'rgba8unorm',
          size: { width: 4, height: 4 },
          sampleCount: 4,
          usage: ['render-attachment', 'sampled'],
        }),
      ).toThrow(/multisampled/);
    });

    it("creates views of a mip level and layer, and rejects ones it doesn't have", () => {
      const texture = device.createTexture({
        dimension: '2d-array',
        format: 'rgba8unorm',
        size: { width: 4, height: 4, depthOrArrayLayers: 2 },
        mipLevelCount: 2,
        usage: ['render-attachment'],
      });

      expect(texture.createView({ mipLevel: 1, arrayLayer: 1 })).toEqual({
        texture,
        mipLevel: 1,
        arrayLayer: 1,
      });
      expect(() => texture.createView({ arrayLayer: 2 })).toThrow(
        /no mip level/,
      );
    });
  });

  describe('samplers', () => {
    it('deduplicates samplers by descriptor and sets their parameters once', () => {
      const first = device.createSampler({ magFilter: 'linear' });
      const second = device.createSampler({
        magFilter: 'linear',
        minFilter: 'nearest',
      });

      expect(second).toBe(first);
      expect(recording.callsTo('createSampler')).toHaveLength(1);
      expect(
        recording
          .callsTo('samplerParameteri')
          .map((call) => [call.args[1], call.args[2]]),
      ).toEqual([
        [glc.GL_TEXTURE_WRAP_S, glc.GL_CLAMP_TO_EDGE],
        [glc.GL_TEXTURE_WRAP_T, glc.GL_CLAMP_TO_EDGE],
        [glc.GL_TEXTURE_WRAP_R, glc.GL_CLAMP_TO_EDGE],
        [glc.GL_TEXTURE_MAG_FILTER, glc.GL_LINEAR],
        [glc.GL_TEXTURE_MIN_FILTER, glc.GL_NEAREST_MIPMAP_NEAREST],
      ]);
    });

    it('sets comparison and clamped anisotropy', () => {
      device.createSampler({ compare: 'less-equal' });
      device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',
        maxAnisotropy: 64,
      });

      const parameters = recording.calls
        .filter((call) => call.name.startsWith('samplerParameter'))
        .map((call) => [call.args[1], call.args[2]]);

      expect(parameters).toContainEqual([
        glc.GL_TEXTURE_COMPARE_MODE,
        glc.GL_COMPARE_REF_TO_TEXTURE,
      ]);
      expect(parameters).toContainEqual([
        glc.GL_TEXTURE_COMPARE_FUNC,
        glc.GL_LEQUAL,
      ]);
      expect(parameters).toContainEqual([
        glc.GL_TEXTURE_MAX_ANISOTROPY_EXT,
        16,
      ]);
    });

    it('rejects anisotropy with a nearest filter', () => {
      expect(() => device.createSampler({ maxAnisotropy: 4 })).toThrow(
        /linear/,
      );
    });
  });
});
