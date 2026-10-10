import * as glc from './gl-constants.js';
import type { DrawBuffersIndexedExtension } from './read-capabilities.js';

// A tracked value of `undefined` isn't known, so the next set always
// reaches WebGL. `null` is a real binding (none).

/** Blending of one draw buffer: enabled, factors and equations. */
interface DrawBufferBlend {
  enabled: boolean | undefined;
  srcRgb: number | undefined;
  dstRgb: number | undefined;
  srcAlpha: number | undefined;
  dstAlpha: number | undefined;
  modeRgb: number | undefined;
  modeAlpha: number | undefined;
  colorMask: number | undefined;
}

/** One face's stencil function and operations. */
interface StencilFace {
  func: number | undefined;
  reference: number | undefined;
  readMask: number | undefined;
  writeMask: number | undefined;
  fail: number | undefined;
  depthFail: number | undefined;
  pass: number | undefined;
}

/** A uniform buffer range bound to one binding point. */
interface UniformBinding {
  buffer: WebGLBuffer | null | undefined;
  offset: number;
  size: number;
}

const textureTargets = [
  glc.GL_TEXTURE_2D,
  glc.GL_TEXTURE_CUBE_MAP,
  glc.GL_TEXTURE_2D_ARRAY,
  glc.GL_TEXTURE_3D,
] as const;

const unknownBlend = (): DrawBufferBlend => ({
  enabled: undefined,
  srcRgb: undefined,
  dstRgb: undefined,
  srcAlpha: undefined,
  dstAlpha: undefined,
  modeRgb: undefined,
  modeAlpha: undefined,
  colorMask: undefined,
});

const unknownStencilFace = (): StencilFace => ({
  func: undefined,
  reference: undefined,
  readMask: undefined,
  writeMask: undefined,
  fail: undefined,
  depthFail: undefined,
  pass: undefined,
});

const sameRect = (
  rect: readonly number[] | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean =>
  rect !== undefined &&
  rect[0] === x &&
  rect[1] === y &&
  rect[2] === width &&
  rect[3] === height;

/**
 * Every piece of WebGL state the device sets, and setters that only call
 * WebGL when the value changes. Every device operation sets state through
 * it. `reset` forgets everything, so the next set of each value reaches
 * WebGL whatever it was.
 *
 * Deleting a WebGL object that's bound resets its bindings to none (or, for
 * a program, unknown), so the device calls `forget` when it deletes one.
 */
export class GlStateCache {
  private readonly _gl: WebGL2RenderingContext;
  private _maxDrawBuffers: number;
  private _drawBuffersIndexed: DrawBuffersIndexedExtension | null;
  private _program: WebGLProgram | null | undefined;
  private _vertexArray: WebGLVertexArrayObject | null | undefined;
  private _defaultVertexArrayIndexBuffer: WebGLBuffer | null | undefined;
  private _readFramebuffer: WebGLFramebuffer | null | undefined;
  private _drawFramebuffer: WebGLFramebuffer | null | undefined;
  private _viewport: readonly number[] | undefined;
  private _scissor: readonly number[] | undefined;
  private _depthRange: readonly number[] | undefined;
  private readonly _capabilities = new Map<number, boolean>();
  private _drawBufferBlends: DrawBufferBlend[];
  private _blendColor: readonly number[] | undefined;
  private _depthMask: boolean | undefined;
  private _depthFunc: number | undefined;
  private _polygonOffset: readonly number[] | undefined;
  private _stencilFront: StencilFace;
  private _stencilBack: StencilFace;
  private _cullFace: number | undefined;
  private _frontFace: number | undefined;
  private _activeTexture: number | undefined;
  private readonly _textures = new Map<number, WebGLTexture | null>();
  private readonly _samplers = new Map<number, WebGLSampler | null>();
  // Units this cache bound a sampler to, kept through `reset`: a sampler
  // stays bound whatever the cache forgets, until it's unbound.
  private readonly _samplerUnits = new Set<number>();
  private readonly _buffers = new Map<number, WebGLBuffer | null>();
  private readonly _uniformBindings = new Map<number, UniformBinding>();
  private readonly _pixelStorage = new Map<number, number | boolean>();

  /**
   * Creates a cache that knows nothing yet.
   * @param gl - The WebGL2 context.
   * @param maxDrawBuffers - The number of draw buffers tracked.
   * @param drawBuffersIndexed - The `OES_draw_buffers_indexed` extension,
   * for per-draw-buffer blending, if the device has it.
   */
  constructor(
    gl: WebGL2RenderingContext,
    maxDrawBuffers: number,
    drawBuffersIndexed: DrawBuffersIndexedExtension | null,
  ) {
    this._gl = gl;
    this._maxDrawBuffers = maxDrawBuffers;
    this._drawBuffersIndexed = drawBuffersIndexed;
    this._program = undefined;
    this._vertexArray = undefined;
    this._defaultVertexArrayIndexBuffer = undefined;
    this._readFramebuffer = undefined;
    this._drawFramebuffer = undefined;
    this._viewport = undefined;
    this._scissor = undefined;
    this._depthRange = undefined;
    this._drawBufferBlends = [];
    this._blendColor = undefined;
    this._depthMask = undefined;
    this._depthFunc = undefined;
    this._polygonOffset = undefined;
    this._stencilFront = unknownStencilFace();
    this._stencilBack = unknownStencilFace();
    this._cullFace = undefined;
    this._frontFace = undefined;
    this._activeTexture = undefined;
    this.reset();
  }

  /**
   * Forgets every value, so the next set of each reaches WebGL.
   */
  public reset(): void {
    this._program = undefined;
    this._vertexArray = undefined;
    this._defaultVertexArrayIndexBuffer = undefined;
    this._readFramebuffer = undefined;
    this._drawFramebuffer = undefined;
    this._viewport = undefined;
    this._scissor = undefined;
    this._depthRange = undefined;
    this._capabilities.clear();
    this._drawBufferBlends = Array.from(
      { length: this._maxDrawBuffers },
      unknownBlend,
    );
    this._blendColor = undefined;
    this._depthMask = undefined;
    this._depthFunc = undefined;
    this._polygonOffset = undefined;
    this._stencilFront = unknownStencilFace();
    this._stencilBack = unknownStencilFace();
    this._cullFace = undefined;
    this._frontFace = undefined;
    this._activeTexture = undefined;
    this._textures.clear();
    this._samplers.clear();
    this._buffers.clear();
    this._uniformBindings.clear();
    this._pixelStorage.clear();
  }

  /**
   * Takes a restored context's draw buffer count and
   * `OES_draw_buffers_indexed` extension object, and forgets everything.
   * @param maxDrawBuffers - The number of draw buffers tracked.
   * @param drawBuffersIndexed - The extension, if the device has it.
   */
  public configure(
    maxDrawBuffers: number,
    drawBuffersIndexed: DrawBuffersIndexedExtension | null,
  ): void {
    this._maxDrawBuffers = maxDrawBuffers;
    this._drawBuffersIndexed = drawBuffersIndexed;
    // A restored context starts with no samplers bound.
    this._samplerUnits.clear();
    this.reset();
  }

  /**
   * Forgets every binding of a WebGL object about to be deleted. Deleting
   * a bound object unbinds it, except a program in use, which stays in use
   * until another is.
   * @param object - The object.
   */
  public forget(object: object): void {
    if (this._program === object) {
      this._program = undefined;
    }

    if (this._vertexArray === object) {
      this._vertexArray = null;
    }

    if (this._defaultVertexArrayIndexBuffer === object) {
      this._defaultVertexArrayIndexBuffer = null;
    }

    if (this._readFramebuffer === object) {
      this._readFramebuffer = null;
    }

    if (this._drawFramebuffer === object) {
      this._drawFramebuffer = null;
    }

    for (const map of [this._textures, this._samplers, this._buffers]) {
      for (const [key, value] of map) {
        if (value === object) {
          map.set(key, null);
        }
      }
    }

    for (const binding of this._uniformBindings.values()) {
      if (binding.buffer === object) {
        binding.buffer = null;
      }
    }
  }

  /**
   * Makes a program current.
   * @param program - The program.
   */
  public useProgram(program: WebGLProgram | null): void {
    if (this._program === program) {
      return;
    }

    this._gl.useProgram(program);
    this._program = program;
  }

  /**
   * Binds a vertex array.
   * @param vertexArray - The vertex array, or `null` for the default one.
   */
  public bindVertexArray(vertexArray: WebGLVertexArrayObject | null): void {
    if (this._vertexArray === vertexArray) {
      return;
    }

    this._gl.bindVertexArray(vertexArray);
    this._vertexArray = vertexArray;
  }

  /**
   * Binds an index buffer to the default vertex array, to upload into it
   * without changing any vertex array the device built.
   * @param buffer - The index buffer.
   */
  public bindIndexBufferForUpload(buffer: WebGLBuffer | null): void {
    this.bindVertexArray(null);

    if (this._defaultVertexArrayIndexBuffer === buffer) {
      return;
    }

    this._gl.bindBuffer(glc.GL_ELEMENT_ARRAY_BUFFER, buffer);
    this._defaultVertexArrayIndexBuffer = buffer;
  }

  /**
   * Binds a framebuffer for drawing.
   * @param framebuffer - The framebuffer, or `null` for the canvas.
   */
  public bindDrawFramebuffer(framebuffer: WebGLFramebuffer | null): void {
    if (this._drawFramebuffer === framebuffer) {
      return;
    }

    this._gl.bindFramebuffer(glc.GL_DRAW_FRAMEBUFFER, framebuffer);
    this._drawFramebuffer = framebuffer;
  }

  /**
   * Binds a framebuffer for reading (a blit's source).
   * @param framebuffer - The framebuffer, or `null` for the canvas.
   */
  public bindReadFramebuffer(framebuffer: WebGLFramebuffer | null): void {
    if (this._readFramebuffer === framebuffer) {
      return;
    }

    this._gl.bindFramebuffer(glc.GL_READ_FRAMEBUFFER, framebuffer);
    this._readFramebuffer = framebuffer;
  }

  /**
   * Binds a framebuffer for both drawing and reading, with one call if both
   * change.
   * @param framebuffer - The framebuffer, or `null` for the canvas.
   */
  public bindFramebuffer(framebuffer: WebGLFramebuffer | null): void {
    if (
      this._drawFramebuffer !== framebuffer &&
      this._readFramebuffer !== framebuffer
    ) {
      this._gl.bindFramebuffer(glc.GL_FRAMEBUFFER, framebuffer);
      this._drawFramebuffer = framebuffer;
      this._readFramebuffer = framebuffer;

      return;
    }

    this.bindDrawFramebuffer(framebuffer);
    this.bindReadFramebuffer(framebuffer);
  }

  /**
   * Sets the viewport.
   * @param x - The left edge.
   * @param y - The bottom edge.
   * @param width - The width.
   * @param height - The height.
   */
  public viewport(x: number, y: number, width: number, height: number): void {
    if (sameRect(this._viewport, x, y, width, height)) {
      return;
    }

    this._gl.viewport(x, y, width, height);
    this._viewport = [x, y, width, height];
  }

  /**
   * Sets the scissor rectangle.
   * @param x - The left edge.
   * @param y - The bottom edge.
   * @param width - The width.
   * @param height - The height.
   */
  public scissor(x: number, y: number, width: number, height: number): void {
    if (sameRect(this._scissor, x, y, width, height)) {
      return;
    }

    this._gl.scissor(x, y, width, height);
    this._scissor = [x, y, width, height];
  }

  /**
   * Sets the depth range clip-space depth maps to.
   * @param near - The depth `-1` maps to.
   * @param far - The depth `1` maps to.
   */
  public depthRange(near: number, far: number): void {
    const current = this._depthRange;

    if (current?.[0] === near && current[1] === far) {
      return;
    }

    this._gl.depthRange(near, far);
    this._depthRange = [near, far];
  }

  /**
   * Enables or disables a capability (`DEPTH_TEST`, `CULL_FACE`, ...). Use
   * `setBlend` for `BLEND`.
   * @param capability - The capability.
   * @param enabled - Whether it's enabled.
   */
  public setEnabled(capability: number, enabled: boolean): void {
    if (this._capabilities.get(capability) === enabled) {
      return;
    }

    if (enabled) {
      this._gl.enable(capability);
    } else {
      this._gl.disable(capability);
    }

    this._capabilities.set(capability, enabled);
  }

  /**
   * Sets the blending of every draw buffer at once.
   * @param enabled - Whether blending is enabled.
   * @param factors - The factors and equations, or `null` to leave them.
   */
  public setBlend(enabled: boolean, factors: BlendFactors | null): void {
    const blends = this._drawBufferBlends;

    if (!blends.every((blend) => blend.enabled === enabled)) {
      if (enabled) {
        this._gl.enable(glc.GL_BLEND);
      } else {
        this._gl.disable(glc.GL_BLEND);
      }

      for (const blend of blends) {
        blend.enabled = enabled;
      }
    }

    if (!factors) {
      return;
    }

    this._setFactorsOfAll(factors);
  }

  /**
   * Sets one draw buffer's blending, through `OES_draw_buffers_indexed`.
   * @param drawBuffer - The draw buffer.
   * @param enabled - Whether blending is enabled.
   * @param factors - Its factors and equations, if enabled.
   * @throws An error without the extension.
   */
  public setBlendOf(
    drawBuffer: number,
    enabled: boolean,
    factors: BlendFactors | null,
  ): void {
    const extension = this._requireIndexed();
    const blend = this._drawBufferBlends[drawBuffer];

    if (blend.enabled !== enabled) {
      if (enabled) {
        extension.enableiOES(glc.GL_BLEND, drawBuffer);
      } else {
        extension.disableiOES(glc.GL_BLEND, drawBuffer);
      }

      blend.enabled = enabled;
    }

    if (!factors) {
      return;
    }

    if (!sameFactors(blend, factors)) {
      extension.blendFuncSeparateiOES(
        drawBuffer,
        factors.srcRgb,
        factors.dstRgb,
        factors.srcAlpha,
        factors.dstAlpha,
      );
      blend.srcRgb = factors.srcRgb;
      blend.dstRgb = factors.dstRgb;
      blend.srcAlpha = factors.srcAlpha;
      blend.dstAlpha = factors.dstAlpha;
    }

    if (
      blend.modeRgb !== factors.modeRgb ||
      blend.modeAlpha !== factors.modeAlpha
    ) {
      extension.blendEquationSeparateiOES(
        drawBuffer,
        factors.modeRgb,
        factors.modeAlpha,
      );
      blend.modeRgb = factors.modeRgb;
      blend.modeAlpha = factors.modeAlpha;
    }
  }

  /**
   * Sets which channels every draw buffer writes.
   * @param mask - Red `1`, green `2`, blue `4` and alpha `8`, combined.
   */
  public colorMask(mask: number): void {
    const blends = this._drawBufferBlends;

    if (blends.every((blend) => blend.colorMask === mask)) {
      return;
    }

    this._gl.colorMask(
      (mask & 1) !== 0,
      (mask & 2) !== 0,
      (mask & 4) !== 0,
      (mask & 8) !== 0,
    );

    for (const blend of blends) {
      blend.colorMask = mask;
    }
  }

  /**
   * Sets which channels one draw buffer writes, through
   * `OES_draw_buffers_indexed`.
   * @param drawBuffer - The draw buffer.
   * @param mask - Red `1`, green `2`, blue `4` and alpha `8`, combined.
   * @throws An error without the extension.
   */
  public colorMaskOf(drawBuffer: number, mask: number): void {
    const blend = this._drawBufferBlends[drawBuffer];

    if (blend.colorMask === mask) {
      return;
    }

    this._requireIndexed().colorMaskiOES(
      drawBuffer,
      (mask & 1) !== 0,
      (mask & 2) !== 0,
      (mask & 4) !== 0,
      (mask & 8) !== 0,
    );
    blend.colorMask = mask;
  }

  /**
   * Sets the color the constant blend factors use.
   * @param color - Red, green, blue and alpha.
   */
  public blendColor(color: readonly number[]): void {
    const current = this._blendColor;

    if (
      current?.[0] === color[0] &&
      current[1] === color[1] &&
      current[2] === color[2] &&
      current[3] === color[3]
    ) {
      return;
    }

    this._gl.blendColor(color[0], color[1], color[2], color[3]);
    this._blendColor = [color[0], color[1], color[2], color[3]];
  }

  /**
   * Sets whether depth is written.
   * @param enabled - Whether it's written.
   */
  public depthMask(enabled: boolean): void {
    if (this._depthMask === enabled) {
      return;
    }

    this._gl.depthMask(enabled);
    this._depthMask = enabled;
  }

  /**
   * Sets the depth test.
   * @param func - The comparison.
   */
  public depthFunc(func: number): void {
    if (this._depthFunc === func) {
      return;
    }

    this._gl.depthFunc(func);
    this._depthFunc = func;
  }

  /**
   * Sets the depth bias.
   * @param factor - The slope-scaled part.
   * @param units - The constant part.
   */
  public polygonOffset(factor: number, units: number): void {
    const current = this._polygonOffset;

    if (current?.[0] === factor && current[1] === units) {
      return;
    }

    this._gl.polygonOffset(factor, units);
    this._polygonOffset = [factor, units];
  }

  /**
   * Sets one face's stencil test, operations and masks.
   * @param face - `FRONT` or `BACK`.
   * @param state - The face's state.
   */
  public stencilFace(face: number, state: StencilFaceState): void {
    const current =
      face === glc.GL_FRONT ? this._stencilFront : this._stencilBack;

    if (
      current.func !== state.func ||
      current.reference !== state.reference ||
      current.readMask !== state.readMask
    ) {
      this._gl.stencilFuncSeparate(
        face,
        state.func,
        state.reference,
        state.readMask,
      );
      current.func = state.func;
      current.reference = state.reference;
      current.readMask = state.readMask;
    }

    if (
      current.fail !== state.fail ||
      current.depthFail !== state.depthFail ||
      current.pass !== state.pass
    ) {
      this._gl.stencilOpSeparate(face, state.fail, state.depthFail, state.pass);
      current.fail = state.fail;
      current.depthFail = state.depthFail;
      current.pass = state.pass;
    }

    if (current.writeMask !== state.writeMask) {
      this._gl.stencilMaskSeparate(face, state.writeMask);
      current.writeMask = state.writeMask;
    }
  }

  /**
   * Sets the stencil write mask of both faces.
   * @param mask - The bits written.
   */
  public stencilMask(mask: number): void {
    if (
      this._stencilFront.writeMask === mask &&
      this._stencilBack.writeMask === mask
    ) {
      return;
    }

    this._gl.stencilMask(mask);
    this._stencilFront.writeMask = mask;
    this._stencilBack.writeMask = mask;
  }

  /**
   * Sets which faces are culled.
   * @param mode - `FRONT` or `BACK`.
   */
  public cullFace(mode: number): void {
    if (this._cullFace === mode) {
      return;
    }

    this._gl.cullFace(mode);
    this._cullFace = mode;
  }

  /**
   * Sets which winding is the front face.
   * @param mode - `CCW` or `CW`.
   */
  public frontFace(mode: number): void {
    if (this._frontFace === mode) {
      return;
    }

    this._gl.frontFace(mode);
    this._frontFace = mode;
  }

  /**
   * Binds a texture to a unit and target.
   * @param unit - The texture unit.
   * @param target - `TEXTURE_2D`, `TEXTURE_CUBE_MAP`, `TEXTURE_2D_ARRAY` or
   * `TEXTURE_3D`.
   * @param texture - The texture, or `null`.
   */
  public bindTexture(
    unit: number,
    target: number,
    texture: WebGLTexture | null,
  ): void {
    const key = unit * textureTargets.length + textureTargetIndex(target);

    if (this._textures.has(key) && this._textures.get(key) === texture) {
      return;
    }

    this._activeTextureUnit(unit);
    this._gl.bindTexture(target, texture);
    this._textures.set(key, texture);
  }

  /**
   * Binds a sampler to a unit.
   * @param unit - The texture unit.
   * @param sampler - The sampler, or `null` for the texture's own
   * parameters.
   */
  public bindSampler(unit: number, sampler: WebGLSampler | null): void {
    if (this._samplers.has(unit) && this._samplers.get(unit) === sampler) {
      return;
    }

    this._gl.bindSampler(unit, sampler);
    this._samplers.set(unit, sampler);

    if (sampler === null) {
      this._samplerUnits.delete(unit);
    } else {
      this._samplerUnits.add(unit);
    }
  }

  /**
   * The units this cache bound a sampler to and hasn't unbound, including
   * any bound before the last `reset`.
   * @returns The units.
   */
  public unitsWithSamplers(): number[] {
    return [...this._samplerUnits];
  }

  /**
   * Binds a buffer to `ARRAY_BUFFER` or `UNIFORM_BUFFER`. Index buffers
   * belong to vertex arrays; see `bindIndexBufferForUpload`.
   * @param target - The target.
   * @param buffer - The buffer.
   */
  public bindBuffer(target: number, buffer: WebGLBuffer | null): void {
    if (this._buffers.has(target) && this._buffers.get(target) === buffer) {
      return;
    }

    this._gl.bindBuffer(target, buffer);
    this._buffers.set(target, buffer);
  }

  /**
   * Binds a uniform buffer range to a binding point. This also binds the
   * buffer to the generic `UNIFORM_BUFFER` target, as WebGL does.
   * @param index - The binding point.
   * @param buffer - The buffer.
   * @param offset - The range's byte offset.
   * @param size - The range's byte size.
   */
  public bindUniformBufferRange(
    index: number,
    buffer: WebGLBuffer | null,
    offset: number,
    size: number,
  ): void {
    const current = this._uniformBindings.get(index);

    if (
      current &&
      current.buffer === buffer &&
      current.offset === offset &&
      current.size === size
    ) {
      return;
    }

    this._gl.bindBufferRange(
      glc.GL_UNIFORM_BUFFER,
      index,
      buffer,
      offset,
      size,
    );
    this._uniformBindings.set(index, { buffer, offset, size });
    this._buffers.set(glc.GL_UNIFORM_BUFFER, buffer);
  }

  /**
   * Sets a pixel storage parameter.
   * @param parameter - The parameter.
   * @param value - Its value.
   */
  public pixelStorei(parameter: number, value: number | boolean): void {
    if (this._pixelStorage.get(parameter) === value) {
      return;
    }

    this._gl.pixelStorei(parameter, Number(value));
    this._pixelStorage.set(parameter, value);
  }

  private _activeTextureUnit(unit: number): void {
    if (this._activeTexture === unit) {
      return;
    }

    this._gl.activeTexture(glc.GL_TEXTURE0 + unit);
    this._activeTexture = unit;
  }

  private _setFactorsOfAll(factors: BlendFactors): void {
    const blends = this._drawBufferBlends;

    if (!blends.every((blend) => sameFactors(blend, factors))) {
      this._gl.blendFuncSeparate(
        factors.srcRgb,
        factors.dstRgb,
        factors.srcAlpha,
        factors.dstAlpha,
      );

      for (const blend of blends) {
        blend.srcRgb = factors.srcRgb;
        blend.dstRgb = factors.dstRgb;
        blend.srcAlpha = factors.srcAlpha;
        blend.dstAlpha = factors.dstAlpha;
      }
    }

    if (
      !blends.every(
        (blend) =>
          blend.modeRgb === factors.modeRgb &&
          blend.modeAlpha === factors.modeAlpha,
      )
    ) {
      this._gl.blendEquationSeparate(factors.modeRgb, factors.modeAlpha);

      for (const blend of blends) {
        blend.modeRgb = factors.modeRgb;
        blend.modeAlpha = factors.modeAlpha;
      }
    }
  }

  private _requireIndexed(): DrawBuffersIndexedExtension {
    if (!this._drawBuffersIndexed) {
      throw new Error(
        'Per-target blending needs the OES_draw_buffers_indexed extension.',
      );
    }

    return this._drawBuffersIndexed;
  }
}

/** A draw buffer's blend factors and equations, as GL enums. */
export interface BlendFactors {
  readonly srcRgb: number;
  readonly dstRgb: number;
  readonly srcAlpha: number;
  readonly dstAlpha: number;
  readonly modeRgb: number;
  readonly modeAlpha: number;
}

/** A face's stencil state, as GL values. */
export type StencilFaceState = Required<{
  [K in keyof StencilFace]: number;
}>;

function sameFactors(blend: DrawBufferBlend, factors: BlendFactors): boolean {
  return (
    blend.srcRgb === factors.srcRgb &&
    blend.dstRgb === factors.dstRgb &&
    blend.srcAlpha === factors.srcAlpha &&
    blend.dstAlpha === factors.dstAlpha
  );
}

function textureTargetIndex(target: number): number {
  const index = textureTargets.indexOf(
    target as (typeof textureTargets)[number],
  );

  if (index === -1) {
    throw new Error(`Unknown texture target ${target}.`);
  }

  return index;
}
