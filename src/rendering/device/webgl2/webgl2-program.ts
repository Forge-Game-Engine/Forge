import type { GpuShaderSources } from '../gpu-render-pipeline.js';
import type { GpuTextureDimension } from '../gpu-texture.js';
import type { DeviceContext, RestorableResource } from './device-context.js';
import * as glc from './gl-constants.js';
import {
  LayoutTextureBinding,
  maxUniformBlocksPerGroup,
  WebGl2BindGroupLayout,
} from './webgl2-bind-group.js';

/** What a GLSL sampler type reads. */
type SamplerKind = 'float' | 'shadow' | 'int' | 'uint';

const samplerTypes = new Map<
  number,
  { dimension: GpuTextureDimension; kind: SamplerKind }
>([
  [glc.GL_SAMPLER_2D, { dimension: '2d', kind: 'float' }],
  [glc.GL_SAMPLER_3D, { dimension: '3d', kind: 'float' }],
  [glc.GL_SAMPLER_CUBE, { dimension: 'cube', kind: 'float' }],
  [glc.GL_SAMPLER_2D_ARRAY, { dimension: '2d-array', kind: 'float' }],
  [glc.GL_SAMPLER_2D_SHADOW, { dimension: '2d', kind: 'shadow' }],
  [glc.GL_SAMPLER_2D_ARRAY_SHADOW, { dimension: '2d-array', kind: 'shadow' }],
  [glc.GL_SAMPLER_CUBE_SHADOW, { dimension: 'cube', kind: 'shadow' }],
  [glc.GL_INT_SAMPLER_2D, { dimension: '2d', kind: 'int' }],
  [glc.GL_INT_SAMPLER_3D, { dimension: '3d', kind: 'int' }],
  [glc.GL_INT_SAMPLER_CUBE, { dimension: 'cube', kind: 'int' }],
  [glc.GL_INT_SAMPLER_2D_ARRAY, { dimension: '2d-array', kind: 'int' }],
  [glc.GL_UNSIGNED_INT_SAMPLER_2D, { dimension: '2d', kind: 'uint' }],
  [glc.GL_UNSIGNED_INT_SAMPLER_3D, { dimension: '3d', kind: 'uint' }],
  [glc.GL_UNSIGNED_INT_SAMPLER_CUBE, { dimension: 'cube', kind: 'uint' }],
  [
    glc.GL_UNSIGNED_INT_SAMPLER_2D_ARRAY,
    { dimension: '2d-array', kind: 'uint' },
  ],
]);

/** Whether a sampler of `kind` reads a texture binding's texels. */
function samplerKindFits(
  kind: SamplerKind,
  binding: LayoutTextureBinding,
): boolean {
  const fits: Record<SamplerKind, boolean> = {
    float:
      binding.samplerType !== 'comparison' &&
      binding.sampleType !== 'uint' &&
      binding.sampleType !== 'sint',
    shadow: binding.samplerType === 'comparison',
    int: binding.sampleType === 'sint',
    uint: binding.sampleType === 'uint',
  };

  return fits[kind];
}

const versionPattern = /^\s*#version[^\n]*\n/;

/**
 * Builds a shader's source: its `#version` line (added if missing), then
 * the defines and the device's prelude, then the rest.
 */
function buildSource(
  source: string,
  defines: GpuShaderSources['defines'],
  prelude: string,
): string {
  const match = versionPattern.exec(source);
  const version = match ? match[0] : '#version 300 es\n';
  const body = match ? source.slice(match[0].length) : source;
  const defineLines = Object.entries(defines ?? {})
    .map(
      ([name, value]) =>
        `#define ${name} ${typeof value === 'boolean' ? Number(value) : value}\n`,
    )
    .join('');

  return `${version}${defineLines}${prelude}${body}`;
}

/** Where each attribute name goes, for `bindAttribLocation`. */
export type AttributeBindings = readonly (readonly [
  name: string,
  location: number,
])[];

/**
 * A linked program and its binding assignments: attribute locations bound
 * before linking, uniform blocks given their slot's binding points, and
 * samplers given their texture units, once, after linking. Shared by every
 * pipeline with the same shaders, defines, attribute bindings and layouts.
 */
export class WebGl2Program implements RestorableResource {
  /** The first texture unit of each bind group slot. */
  public readonly unitBases: readonly number[];

  private readonly _context: DeviceContext;
  private readonly _sources: GpuShaderSources;
  private readonly _attributeBindings: AttributeBindings;
  private readonly _layouts: readonly WebGl2BindGroupLayout[];
  private readonly _label: string;
  private _glProgram: WebGLProgram | null;

  /**
   * Links the program, unless the context is lost.
   * @param context - The device's shared context.
   * @param sources - The shaders and defines.
   * @param attributeBindings - The attribute locations.
   * @param layouts - The layout of each bind group slot.
   * @param label - The pipeline's label, for errors.
   * @throws An error if the shaders fail to compile or link, or don't fit
   * the layouts.
   */
  constructor(
    context: DeviceContext,
    sources: GpuShaderSources,
    attributeBindings: AttributeBindings,
    layouts: readonly WebGl2BindGroupLayout[],
    label: string,
  ) {
    this._context = context;
    this._sources = sources;
    this._attributeBindings = attributeBindings;
    this._layouts = layouts;
    this._label = label;
    this._glProgram = null;

    let unit = 0;

    this.unitBases = layouts.map((layout) => {
      const base = unit;

      unit += layout.textures.length;

      return base;
    });

    if (!context.isContextLost) {
      this.restore();
    }
  }

  /** The linked program, or `null` until it's linked. */
  get glProgram(): WebGLProgram | null {
    return this._glProgram;
  }

  /**
   * Compiles and links the program and assigns its bindings. Runs when it's
   * created and when a lost context is restored.
   * @throws An error if the shaders fail to compile or link, or don't fit
   * the layouts.
   */
  public restore(): void {
    const { gl } = this._context;
    const prelude = this._context.capabilities.multiDraw
      ? '#extension GL_ANGLE_multi_draw : require\n#define FORGE_DRAW_ID gl_DrawID\n'
      : '#define FORGE_DRAW_ID 0\n';
    const vertex = this._compile(
      glc.GL_VERTEX_SHADER,
      buildSource(this._sources.vertex, this._sources.defines, prelude),
    );
    const fragment = this._compile(
      glc.GL_FRAGMENT_SHADER,
      buildSource(this._sources.fragment, this._sources.defines, ''),
    );
    const program = gl.createProgram();

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);

    for (const [name, location] of this._attributeBindings) {
      gl.bindAttribLocation(program, location, name);
    }

    gl.linkProgram(program);

    const isLinked =
      gl.getProgramParameter(program, glc.GL_LINK_STATUS) === true;

    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    if (!isLinked) {
      const log = gl.getProgramInfoLog(program) ?? '';

      gl.deleteProgram(program);

      throw new Error(`Pipeline "${this._label}" failed to link: ${log}`);
    }

    try {
      this._assignBlocks(program);
      this._assignSamplers(program);
    } catch (error) {
      gl.deleteProgram(program);

      throw error;
    }

    this._glProgram = program;
  }

  private _compile(type: number, source: string): WebGLShader {
    const { gl } = this._context;
    const shader = gl.createShader(type);

    if (!shader) {
      throw new Error(`Pipeline "${this._label}" couldn't create a shader.`);
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, glc.GL_COMPILE_STATUS) !== true) {
      const log = gl.getShaderInfoLog(shader) ?? '';
      const stage = type === glc.GL_VERTEX_SHADER ? 'vertex' : 'fragment';

      gl.deleteShader(shader);

      throw new Error(
        `Pipeline "${this._label}"'s ${stage} shader failed to compile: ${log}`,
      );
    }

    return shader;
  }

  /** Gives each uniform block its slot's binding point. */
  private _assignBlocks(program: WebGLProgram): void {
    const { gl } = this._context;
    const blockCount = Number(
      gl.getProgramParameter(program, glc.GL_ACTIVE_UNIFORM_BLOCKS),
    );
    const bindingPoints = new Map<string, number>();

    this._layouts.forEach((layout, slot) => {
      for (const block of layout.buffers) {
        bindingPoints.set(
          block.name,
          slot * maxUniformBlocksPerGroup + block.blockIndex,
        );
      }
    });

    for (let index = 0; index < blockCount; index++) {
      const name = gl.getActiveUniformBlockName(program, index) ?? '';
      const bindingPoint = bindingPoints.get(name);

      if (bindingPoint === undefined) {
        throw new Error(
          `Pipeline "${this._label}"'s shaders read uniform block "${name}", which none of its bind group layouts names.`,
        );
      }

      gl.uniformBlockBinding(program, index, bindingPoint);
    }
  }

  /**
   * Gives each sampler its texture unit, once, and checks that no uniform
   * lives outside a block and every sampler matches its binding.
   */
  private _assignSamplers(program: WebGLProgram): void {
    const { gl, state } = this._context;
    const uniformCount = Number(
      gl.getProgramParameter(program, glc.GL_ACTIVE_UNIFORMS),
    );
    const indices = Array.from({ length: uniformCount }, (_, index) => index);
    const blockIndices: unknown =
      uniformCount > 0
        ? gl.getActiveUniforms(program, indices, glc.GL_UNIFORM_BLOCK_INDEX)
        : [];
    const bindings = new Map<
      string,
      { binding: LayoutTextureBinding; unit: number }
    >();

    this._layouts.forEach((layout, slot) => {
      for (const binding of layout.textures) {
        bindings.set(binding.name, {
          binding,
          unit: this.unitBases[slot] + binding.unitOffset,
        });
      }
    });

    this._context.beginOperation();

    for (const index of indices) {
      if (Array.isArray(blockIndices) && blockIndices[index] !== -1) {
        continue;
      }

      const info = gl.getActiveUniform(program, index);

      if (!info) {
        continue;
      }

      const unit = this._samplerUnit(info, bindings);

      state.useProgram(program);
      gl.uniform1i(gl.getUniformLocation(program, info.name), unit);
    }
  }

  private _samplerUnit(
    info: WebGLActiveInfo,
    bindings: ReadonlyMap<
      string,
      { binding: LayoutTextureBinding; unit: number }
    >,
  ): number {
    const sampler = samplerTypes.get(info.type);
    const where = `Pipeline "${this._label}"'s uniform "${info.name}"`;

    if (!sampler) {
      throw new Error(
        `${where} isn't in a uniform block. Put it in a block that a bind group layout names.`,
      );
    }

    const entry = bindings.get(info.name);

    if (!entry || info.size !== 1) {
      throw new Error(
        `${where} is a sampler that none of its bind group layouts names.`,
      );
    }

    if (
      sampler.dimension !== entry.binding.viewDimension ||
      !samplerKindFits(sampler.kind, entry.binding)
    ) {
      throw new Error(
        `${where} doesn't match its binding: it's a ${sampler.kind} '${sampler.dimension}' sampler, and the binding reads '${entry.binding.sampleType}' '${entry.binding.viewDimension}' textures with a '${entry.binding.samplerType}' sampler.`,
      );
    }

    return entry.unit;
  }
}
