import { vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import * as glc from '../device/webgl2/gl-constants.js';
import { RenderContext } from '../render-context.js';
import { ShaderCache } from '../shaders/index.js';

/** One call made on a recording context. */
export interface RecordedCall {
  /** The method's name, or `extension.method` for an extension's. */
  readonly name: string;

  /** The arguments it was called with. */
  readonly args: readonly unknown[];
}

/** A WebGL object a recording context created. */
export interface RecordedObject {
  readonly kind: string;
  readonly id: number;
}

/** The WebGL state a recording context models. */
export interface RecordingGlState {
  program: unknown;
  vertexArray: unknown;
  drawFramebuffer: unknown;
  readFramebuffer: unknown;
  activeTexture: number;
  readonly textures: Map<string, unknown>;
  readonly samplers: Map<number, unknown>;
  readonly buffers: Map<number, unknown>;
  readonly uniformBuffers: Map<number, readonly unknown[]>;
  readonly enabled: Set<number>;
  readonly pixelStorage: Map<number, unknown>;
  blendFunc: readonly number[];
  blendEquation: readonly number[];
  colorMask: readonly boolean[];
  depthMask: boolean;
  depthFunc: number;
  cullFace: number;
  frontFace: number;
  viewport: readonly number[];
  scissor: readonly number[];
}

/** Options for {@link createRecordingGl}. */
export interface RecordingGlOptions {
  /**
   * The extensions the context has (default: `EXT_color_buffer_float`,
   * `OES_texture_float_linear` and `EXT_texture_filter_anisotropic`).
   */
  extensions?: readonly string[];

  /** Limits to report instead of the defaults, by GL enum. */
  limits?: ReadonlyMap<number, number>;

  /** The sample counts every renderable format supports (default: 4, 2). */
  sampleCounts?: readonly number[];

  /** The drawing buffer's size (default: 300 x 150). */
  drawingBufferSize?: { width: number; height: number };

  /**
   * Returns a compile error for a shader source, or `null` to compile it
   * (default: every shader compiles).
   */
  compileError?: (source: string) => string | null;
}

/** A WebGL2 fake that records every call. */
export interface RecordingGl {
  /** The fake context. */
  readonly gl: WebGL2RenderingContext;

  /** Every call made, in order. */
  readonly calls: RecordedCall[];

  /** The state the calls left. */
  readonly state: RecordingGlState;

  /** Whether the context is lost. Set it to lose or restore the context. */
  isLost: boolean;

  /** Forgets the calls made so far. */
  clearCalls(): void;

  /**
   * Returns the calls of one method.
   * @param name - The method's name.
   * @returns Its calls, in order.
   */
  callsTo(name: string): RecordedCall[];

  /**
   * The source of a shader the context compiled.
   * @param shader - The shader object.
   * @returns Its source.
   */
  shaderSource(shader: unknown): string;
}

const defaultLimits = new Map<number, number>([
  [glc.GL_MAX_TEXTURE_SIZE, 4096],
  [glc.GL_MAX_3D_TEXTURE_SIZE, 2048],
  [glc.GL_MAX_ARRAY_TEXTURE_LAYERS, 256],
  [glc.GL_MAX_CUBE_MAP_TEXTURE_SIZE, 4096],
  [glc.GL_MAX_SAMPLES, 4],
  [glc.GL_MAX_UNIFORM_BLOCK_SIZE, 16384],
  [glc.GL_MAX_UNIFORM_BUFFER_BINDINGS, 24],
  [glc.GL_MAX_TEXTURE_IMAGE_UNITS, 16],
  [glc.GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS, 16],
  [glc.GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS, 32],
  [glc.GL_UNIFORM_BUFFER_OFFSET_ALIGNMENT, 256],
  [glc.GL_MAX_DRAW_BUFFERS, 8],
  [glc.GL_MAX_COLOR_ATTACHMENTS, 8],
  [glc.GL_MAX_VERTEX_ATTRIBS, 16],
  [glc.GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT, 16],
]);

const glslTypes = new Map<string, number>([
  ['float', glc.GL_FLOAT],
  ['vec2', 0x8b50],
  ['vec3', 0x8b51],
  ['vec4', 0x8b52],
  ['int', glc.GL_INT],
  ['uint', glc.GL_UNSIGNED_INT],
  ['mat3', 0x8b5b],
  ['mat4', 0x8b5c],
  ['sampler2D', glc.GL_SAMPLER_2D],
  ['sampler3D', glc.GL_SAMPLER_3D],
  ['samplerCube', glc.GL_SAMPLER_CUBE],
  ['sampler2DArray', glc.GL_SAMPLER_2D_ARRAY],
  ['sampler2DShadow', glc.GL_SAMPLER_2D_SHADOW],
  ['sampler2DArrayShadow', glc.GL_SAMPLER_2D_ARRAY_SHADOW],
  ['usampler2D', glc.GL_UNSIGNED_INT_SAMPLER_2D],
  ['isampler2D', glc.GL_INT_SAMPLER_2D],
]);

/** A uniform a linked program reports. */
interface ActiveUniform {
  name: string;
  type: number;
  size: number;
  blockIndex: number;
}

const precisions = new Set(['lowp', 'mediump', 'highp']);

/** Splits GLSL into words and the punctuation that matters here. */
function tokenize(source: string): string[] {
  const withoutComments = source
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  return withoutComments
    .replace(/[{};[\]]/g, (punctuation) => ` ${punctuation} `)
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Reads one declaration (`[precision] type name[size];`) from `tokens` at
 * `start`.
 */
function readDeclaration(
  tokens: readonly string[],
  start: number,
): { type: string; name: string; size: number; end: number } {
  let index = precisions.has(tokens[start]) ? start + 1 : start;
  const type = tokens[index++];
  const name = tokens[index++];
  let size = 1;

  if (tokens[index] === '[') {
    size = Number(tokens[index + 1]);
    index += 3;
  }

  return { type, name, size, end: tokens.indexOf(';', index) };
}

/**
 * Reads the uniform blocks and loose uniforms a pair of shaders declare,
 * as a linked program would report them: every declaration is active.
 */
function introspect(sources: readonly string[]): {
  blocks: string[];
  uniforms: ActiveUniform[];
} {
  const blocks: string[] = [];
  const uniforms: ActiveUniform[] = [];
  const seen = new Set<string>();

  for (const tokens of sources.map(tokenize)) {
    let index = tokens.indexOf('uniform');

    while (index !== -1) {
      if (tokens[index + 2] === '{') {
        index = readBlock(tokens, index + 1, blocks, uniforms);
      } else {
        const { type, name, size, end } = readDeclaration(tokens, index + 1);

        if (!seen.has(name)) {
          seen.add(name);
          uniforms.push({
            name,
            type: glslTypes.get(type) ?? glc.GL_FLOAT,
            size,
            blockIndex: -1,
          });
        }

        index = end;
      }

      index = tokens.indexOf('uniform', index);
    }
  }

  return { blocks, uniforms };
}

/** Reads a uniform block's members, returning where the block ends. */
function readBlock(
  tokens: readonly string[],
  start: number,
  blocks: string[],
  uniforms: ActiveUniform[],
): number {
  const blockName = tokens[start];
  const close = tokens.indexOf('}', start);
  const isNew = !blocks.includes(blockName);

  if (isNew) {
    blocks.push(blockName);
  }

  let index = start + 2;

  while (index < close) {
    const { type, name, size, end } = readDeclaration(tokens, index);

    if (isNew) {
      uniforms.push({
        name,
        type: glslTypes.get(type) ?? glc.GL_FLOAT,
        size,
        blockIndex: blocks.indexOf(blockName),
      });
    }

    index = end + 1;
  }

  return close;
}

const constants = new Map(
  Object.entries(glc).map(([name, value]) => [name.replace(/^GL_/, ''), value]),
);

/**
 * Creates a WebGL2 fake that records every call and models the state that
 * matters to the device (bound program, vertex array, buffers, textures,
 * samplers, framebuffers, enabled capabilities, blend, depth and pixel
 * storage state). Programs report every uniform and uniform block their
 * shaders declare as active, with block members in their blocks. GL enums
 * are the real values. Calls that aren't modeled are recorded and return
 * `undefined`.
 * @param options - The extensions, limits and sample counts to report.
 * @returns The fake and its records.
 */
export function createRecordingGl(
  options: RecordingGlOptions = {},
): RecordingGl {
  const extensions = new Set(
    options.extensions ?? [
      'EXT_color_buffer_float',
      'OES_texture_float_linear',
      'EXT_texture_filter_anisotropic',
    ],
  );
  const limits = new Map([...defaultLimits, ...(options.limits ?? [])]);
  const sampleCounts = options.sampleCounts ?? [4, 2];
  const size = options.drawingBufferSize ?? { width: 300, height: 150 };
  const calls: RecordedCall[] = [];
  const shaderSources = new Map<unknown, string>();
  const attachedShaders = new Map<unknown, unknown[]>();
  const programs = new Map<unknown, ReturnType<typeof introspect>>();
  let nextId = 1;

  const state: RecordingGlState = {
    program: null,
    vertexArray: null,
    drawFramebuffer: null,
    readFramebuffer: null,
    activeTexture: glc.GL_TEXTURE0,
    textures: new Map(),
    samplers: new Map(),
    buffers: new Map(),
    uniformBuffers: new Map(),
    enabled: new Set(),
    pixelStorage: new Map(),
    blendFunc: [glc.GL_ONE, glc.GL_ZERO, glc.GL_ONE, glc.GL_ZERO],
    blendEquation: [glc.GL_FUNC_ADD, glc.GL_FUNC_ADD],
    colorMask: [true, true, true, true],
    depthMask: true,
    depthFunc: glc.GL_LESS,
    cullFace: glc.GL_BACK,
    frontFace: glc.GL_CCW,
    viewport: [0, 0, size.width, size.height],
    scissor: [0, 0, size.width, size.height],
  };

  const recording: RecordingGl = {
    gl: undefined as unknown as WebGL2RenderingContext,
    calls,
    state,
    isLost: false,
    clearCalls: () => {
      calls.length = 0;
    },
    callsTo: (name) => calls.filter((call) => call.name === name),
    shaderSource: (shader) => shaderSources.get(shader) ?? '',
  };

  const create = (kind: string) => (): RecordedObject => ({
    kind,
    id: nextId++,
  });

  const recordExtension = (
    extension: string,
    methods: readonly string[],
  ): object =>
    Object.fromEntries(
      methods.map((method) => [
        method,
        (...args: unknown[]) => {
          calls.push({ name: `${extension}.${method}`, args });
        },
      ]),
    );

  const handlers: Record<string, (...args: never[]) => unknown> = {
    isContextLost: () => recording.isLost,
    getExtension: (name: string) => {
      if (recording.isLost || !extensions.has(name)) {
        return null;
      }

      if (name === 'OES_draw_buffers_indexed') {
        return recordExtension(name, [
          'enableiOES',
          'disableiOES',
          'blendEquationSeparateiOES',
          'blendFuncSeparateiOES',
          'colorMaskiOES',
        ]);
      }

      return {};
    },
    getParameter: (parameter: number) =>
      recording.isLost ? null : (limits.get(parameter) ?? null),
    getInternalformatParameter: () =>
      recording.isLost ? null : new Int32Array(sampleCounts),
    createBuffer: create('buffer'),
    createTexture: create('texture'),
    createSampler: create('sampler'),
    createFramebuffer: create('framebuffer'),
    createRenderbuffer: create('renderbuffer'),
    createVertexArray: create('vertexArray'),
    createProgram: create('program'),
    createShader: create('shader'),
    shaderSource: (shader: unknown, source: string) => {
      shaderSources.set(shader, source);
    },
    getShaderParameter: (shader: unknown) =>
      !recording.isLost &&
      (options.compileError?.(shaderSources.get(shader) ?? '') ?? null) ===
        null,
    getShaderInfoLog: (shader: unknown) =>
      options.compileError?.(shaderSources.get(shader) ?? '') ?? '',
    attachShader: (program: unknown, shader: unknown) => {
      attachedShaders.set(program, [
        ...(attachedShaders.get(program) ?? []),
        shader,
      ]);
    },
    linkProgram: (program: unknown) => {
      const sources = (attachedShaders.get(program) ?? []).map(
        (shader) => shaderSources.get(shader) ?? '',
      );

      programs.set(program, introspect(sources));
    },
    getProgramParameter: (program: unknown, parameter: number) => {
      const info = programs.get(program);

      if (recording.isLost || !info) {
        return null;
      }

      const byParameter = new Map<number, unknown>([
        [glc.GL_LINK_STATUS, true],
        [glc.GL_ACTIVE_UNIFORMS, info.uniforms.length],
        [glc.GL_ACTIVE_UNIFORM_BLOCKS, info.blocks.length],
      ]);

      return byParameter.get(parameter) ?? null;
    },
    getProgramInfoLog: () => '',
    getActiveUniformBlockName: (program: unknown, index: number) =>
      programs.get(program)?.blocks[index] ?? null,
    getUniformBlockIndex: (program: unknown, name: string) => {
      const index = programs.get(program)?.blocks.indexOf(name) ?? -1;

      return index === -1 ? glc.GL_INVALID_INDEX : index;
    },
    getActiveUniforms: (program: unknown, indices: number[]) =>
      indices.map(
        (index) => programs.get(program)?.uniforms[index]?.blockIndex ?? -1,
      ),
    getActiveUniform: (program: unknown, index: number) => {
      const uniform = programs.get(program)?.uniforms[index];

      return uniform
        ? { name: uniform.name, type: uniform.type, size: uniform.size }
        : null;
    },
    getUniformLocation: (program: unknown, name: string) =>
      programs.get(program)?.uniforms.some((uniform) => uniform.name === name)
        ? { kind: 'uniformLocation', program, name }
        : null,
    checkFramebufferStatus: () => glc.GL_FRAMEBUFFER_COMPLETE,
    useProgram: (program: unknown) => {
      state.program = program;
    },
    bindVertexArray: (vertexArray: unknown) => {
      state.vertexArray = vertexArray;
    },
    bindFramebuffer: (target: number, framebuffer: unknown) => {
      if (target !== glc.GL_READ_FRAMEBUFFER) {
        state.drawFramebuffer = framebuffer;
      }

      if (target !== glc.GL_DRAW_FRAMEBUFFER) {
        state.readFramebuffer = framebuffer;
      }
    },
    bindBuffer: (target: number, buffer: unknown) => {
      state.buffers.set(target, buffer);
    },
    bindBufferRange: (
      target: number,
      index: number,
      buffer: unknown,
      offset: number,
      byteSize: number,
    ) => {
      state.buffers.set(target, buffer);
      state.uniformBuffers.set(index, [buffer, offset, byteSize]);
    },
    activeTexture: (unit: number) => {
      state.activeTexture = unit;
    },
    bindTexture: (target: number, texture: unknown) => {
      state.textures.set(
        `${state.activeTexture - glc.GL_TEXTURE0}:${target}`,
        texture,
      );
    },
    bindSampler: (unit: number, sampler: unknown) => {
      state.samplers.set(unit, sampler);
    },
    enable: (capability: number) => {
      state.enabled.add(capability);
    },
    disable: (capability: number) => {
      state.enabled.delete(capability);
    },
    blendFuncSeparate: (...factors: number[]) => {
      state.blendFunc = factors;
    },
    blendEquationSeparate: (...modes: number[]) => {
      state.blendEquation = modes;
    },
    colorMask: (...mask: boolean[]) => {
      state.colorMask = mask;
    },
    depthMask: (enabled: boolean) => {
      state.depthMask = enabled;
    },
    depthFunc: (func: number) => {
      state.depthFunc = func;
    },
    cullFace: (mode: number) => {
      state.cullFace = mode;
    },
    frontFace: (mode: number) => {
      state.frontFace = mode;
    },
    viewport: (...rect: number[]) => {
      state.viewport = rect;
    },
    scissor: (...rect: number[]) => {
      state.scissor = rect;
    },
    pixelStorei: (parameter: number, value: unknown) => {
      state.pixelStorage.set(parameter, value);
    },
  };

  const gl = new Proxy(
    {},
    {
      get(_, property): unknown {
        if (typeof property !== 'string') {
          return undefined;
        }

        if (property === 'drawingBufferWidth') {
          return size.width;
        }

        if (property === 'drawingBufferHeight') {
          return size.height;
        }

        if (constants.has(property)) {
          return constants.get(property);
        }

        return (...args: unknown[]): unknown => {
          calls.push({ name: property, args });

          const handler = handlers[property] as
            ((...handlerArgs: unknown[]) => unknown) | undefined;

          return handler?.(...args);
        };
      },
    },
  ) as WebGL2RenderingContext;

  Object.assign(recording, { gl });

  return recording;
}

/** A render context over a recording context. */
export interface RecordingRenderContext {
  readonly renderContext: RenderContext;
  readonly recording: RecordingGl;
  readonly canvas: HTMLCanvasElement;

  /** Loses the context, as the browser does. */
  loseContext(): void;

  /** Restores the context, as the browser does. */
  restoreContext(): void;
}

/**
 * Creates a render context whose canvas returns a recording context.
 * @param options - Options for the recording context.
 * @returns The render context, the recording, and context loss controls.
 */
export function createRecordingRenderContext(
  options: RecordingGlOptions = {},
): RecordingRenderContext {
  const recording = createRecordingGl(options);
  const canvas = document.createElement('canvas');

  canvas.width = options.drawingBufferSize?.width ?? 300;
  canvas.height = options.drawingBufferSize?.height ?? 150;
  vi.spyOn(canvas, 'getContext').mockReturnValue(recording.gl);

  const renderContext = new RenderContext(
    new ShaderCache([]),
    new ImageCache(),
    canvas,
  );

  return {
    renderContext,
    recording,
    canvas,
    loseContext: () => {
      recording.isLost = true;
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    },
    restoreContext: () => {
      recording.isLost = false;
      canvas.dispatchEvent(new Event('webglcontextrestored'));
    },
  };
}
