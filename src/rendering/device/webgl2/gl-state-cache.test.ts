import { beforeEach, describe, expect, it } from 'vitest';
import {
  createRecordingGl,
  RecordingGl,
} from '../../test-helpers/recording-gl.js';
import * as glc from './gl-constants.js';
import { GlStateCache } from './gl-state-cache.js';

const blend = {
  srcRgb: glc.GL_SRC_ALPHA,
  dstRgb: glc.GL_ONE_MINUS_SRC_ALPHA,
  srcAlpha: glc.GL_ONE,
  dstAlpha: glc.GL_ONE_MINUS_SRC_ALPHA,
  modeRgb: glc.GL_FUNC_ADD,
  modeAlpha: glc.GL_FUNC_ADD,
};

describe('GlStateCache', () => {
  let recording: RecordingGl;
  let cache: GlStateCache;

  beforeEach(() => {
    recording = createRecordingGl();
    cache = new GlStateCache(recording.gl, 4, null);
  });

  it('issues no call when the same state is set again', () => {
    const program = recording.gl.createProgram();
    const texture = recording.gl.createTexture();
    const buffer = recording.gl.createBuffer();

    recording.clearCalls();

    for (let repeat = 0; repeat < 3; repeat++) {
      cache.useProgram(program);
      cache.bindVertexArray(null);
      cache.bindFramebuffer(null);
      cache.viewport(0, 0, 10, 20);
      cache.scissor(1, 2, 3, 4);
      cache.depthRange(0, 1);
      cache.setEnabled(glc.GL_DEPTH_TEST, true);
      cache.setBlend(true, blend);
      cache.colorMask(0xf);
      cache.blendColor([1, 0, 0, 1]);
      cache.depthMask(false);
      cache.depthFunc(glc.GL_LEQUAL);
      cache.polygonOffset(1, 2);
      cache.cullFace(glc.GL_BACK);
      cache.frontFace(glc.GL_CW);
      cache.bindTexture(3, glc.GL_TEXTURE_2D, texture);
      cache.bindSampler(3, null);
      cache.bindBuffer(glc.GL_ARRAY_BUFFER, buffer);
      cache.bindUniformBufferRange(2, buffer, 256, 64);
      cache.pixelStorei(glc.GL_UNPACK_ALIGNMENT, 1);
    }

    const names = recording.calls.map((call) => call.name);

    expect(names).toEqual([
      'useProgram',
      'bindVertexArray',
      'bindFramebuffer',
      'viewport',
      'scissor',
      'depthRange',
      'enable',
      'enable',
      'blendFuncSeparate',
      'blendEquationSeparate',
      'colorMask',
      'blendColor',
      'depthMask',
      'depthFunc',
      'polygonOffset',
      'cullFace',
      'frontFace',
      'activeTexture',
      'bindTexture',
      'bindSampler',
      'bindBuffer',
      'bindBufferRange',
      'pixelStorei',
    ]);
  });

  it('sets everything again after a reset', () => {
    cache.useProgram(null);
    cache.setEnabled(glc.GL_BLEND, false);
    cache.reset();
    recording.clearCalls();

    cache.useProgram(null);
    cache.setEnabled(glc.GL_BLEND, false);

    expect(recording.calls.map((call) => call.name)).toEqual([
      'useProgram',
      'disable',
    ]);
  });

  it('binds a framebuffer for drawing and reading with one call when both change', () => {
    const framebuffer = recording.gl.createFramebuffer();

    recording.clearCalls();
    cache.bindFramebuffer(framebuffer);
    cache.bindReadFramebuffer(framebuffer);
    cache.bindDrawFramebuffer(null);

    expect(recording.calls).toEqual([
      { name: 'bindFramebuffer', args: [glc.GL_FRAMEBUFFER, framebuffer] },
      { name: 'bindFramebuffer', args: [glc.GL_DRAW_FRAMEBUFFER, null] },
    ]);
  });

  it('treats a uniform buffer range as also binding the generic uniform buffer target', () => {
    const buffer = recording.gl.createBuffer();

    cache.bindUniformBufferRange(0, buffer, 0, 16);
    recording.clearCalls();
    cache.bindBuffer(glc.GL_UNIFORM_BUFFER, buffer);

    expect(recording.calls).toHaveLength(0);
  });

  it('knows a deleted vertex array is unbound, and a deleted program unknown', () => {
    const vertexArray = recording.gl.createVertexArray();
    const program = recording.gl.createProgram();

    cache.bindVertexArray(vertexArray);
    cache.useProgram(program);
    cache.forget(vertexArray);
    cache.forget(program);
    recording.clearCalls();
    cache.bindVertexArray(null);
    cache.useProgram(null);

    expect(recording.calls.map((call) => call.name)).toEqual(['useProgram']);
  });

  it('only changes the active texture unit when a binding on another unit changes', () => {
    const first = recording.gl.createTexture();
    const second = recording.gl.createTexture();

    recording.clearCalls();
    cache.bindTexture(0, glc.GL_TEXTURE_2D, first);
    cache.bindTexture(0, glc.GL_TEXTURE_CUBE_MAP, second);
    cache.bindTexture(1, glc.GL_TEXTURE_2D, second);
    cache.bindTexture(0, glc.GL_TEXTURE_2D, first);

    expect(recording.calls.map((call) => call.name)).toEqual([
      'activeTexture',
      'bindTexture',
      'bindTexture',
      'activeTexture',
      'bindTexture',
    ]);
    expect(recording.state.textures.get(`1:${glc.GL_TEXTURE_2D}`)).toBe(second);
  });

  it('needs OES_draw_buffers_indexed for per-draw-buffer blending', () => {
    expect(() => {
      cache.setBlendOf(1, true, blend);
    }).toThrow(/OES_draw_buffers_indexed/);
  });

  it('sets one draw buffer through OES_draw_buffers_indexed, once', () => {
    const indexed = createRecordingGl({
      extensions: ['OES_draw_buffers_indexed'],
    });
    const extension = indexed.gl.getExtension(
      'OES_draw_buffers_indexed',
    ) as never;
    const indexedCache = new GlStateCache(indexed.gl, 4, extension);

    indexed.clearCalls();
    indexedCache.setBlendOf(1, true, blend);
    indexedCache.setBlendOf(1, true, blend);
    indexedCache.colorMaskOf(1, 0x1);
    indexedCache.colorMaskOf(1, 0x1);

    expect(indexed.calls.map((call) => call.name)).toEqual([
      'OES_draw_buffers_indexed.enableiOES',
      'OES_draw_buffers_indexed.blendFuncSeparateiOES',
      'OES_draw_buffers_indexed.blendEquationSeparateiOES',
      'OES_draw_buffers_indexed.colorMaskiOES',
    ]);
  });
});
