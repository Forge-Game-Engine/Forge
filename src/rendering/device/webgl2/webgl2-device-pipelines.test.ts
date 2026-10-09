import { beforeEach, describe, expect, it } from 'vitest';
import {
  createRecordingRenderContext,
  RecordingGl,
} from '../../test-helpers/recording-gl.js';
import type { GpuBindGroupLayout } from '../gpu-bind-group.js';
import type { GpuDevice } from '../gpu-device.js';
import {
  blendStates,
  GpuRenderPipelineDescriptor,
  vertexSemanticLocations,
} from '../gpu-render-pipeline.js';
import type { GpuTexture } from '../gpu-texture.js';
import * as glc from './gl-constants.js';

const vertexShader = `#version 300 es
in vec3 a_position;
in vec4 a_instanceTint;
uniform ForgeView { mat4 viewProjection; };
uniform ForgeDraw { mat4 model; };
void main() {
  gl_Position = viewProjection * model * vec4(a_position, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_baseColor;
uniform sampler2D u_emissive;
out vec4 color;
void main() {
  color = texture(u_baseColor, vec2(0.5)) + texture(u_emissive, vec2(0.5));
}
`;

describe('WebGL2 pipelines, bind groups and passes', () => {
  let recording: RecordingGl;
  let device: GpuDevice;
  let viewLayout: GpuBindGroupLayout;
  let materialLayout: GpuBindGroupLayout;
  let drawLayout: GpuBindGroupLayout;
  let target: GpuTexture;
  let depth: GpuTexture;

  const describePipeline = (
    overrides: Partial<GpuRenderPipelineDescriptor> = {},
  ): GpuRenderPipelineDescriptor => ({
    shaders: { vertex: vertexShader, fragment: fragmentShader },
    vertexBuffers: [
      {
        stride: 12,
        attributes: [{ semantic: 'position', format: 'float32x3', offset: 0 }],
      },
      {
        stride: 4,
        stepMode: 'instance',
        attributes: [
          {
            name: 'a_instanceTint',
            shaderLocation: 12,
            format: 'unorm8x4',
            offset: 0,
          },
        ],
      },
    ],
    primitive: { cullMode: 'back' },
    depthStencil: {
      format: 'depth24plus',
      depthWrite: true,
      depthCompare: 'less-equal',
    },
    targets: [{ format: 'rgba8unorm', blend: blendStates.premultipliedOver }],
    bindGroupLayouts: [
      device.createBindGroupLayout({ entries: [] }),
      viewLayout,
      materialLayout,
      drawLayout,
    ],
    ...overrides,
  });

  beforeEach(() => {
    const context = createRecordingRenderContext();

    recording = context.recording;
    device = context.renderContext.device;
    viewLayout = device.createBindGroupLayout({
      label: 'view',
      entries: [
        { binding: 0, visibility: ['vertex'], buffer: { name: 'ForgeView' } },
      ],
    });
    materialLayout = device.createBindGroupLayout({
      label: 'material',
      entries: [
        {
          binding: 0,
          visibility: ['fragment'],
          texture: { name: 'u_baseColor' },
        },
        {
          binding: 1,
          visibility: ['fragment'],
          texture: { name: 'u_emissive' },
        },
      ],
    });
    drawLayout = device.createBindGroupLayout({
      label: 'draw',
      entries: [
        {
          binding: 0,
          visibility: ['vertex'],
          buffer: { name: 'ForgeDraw', hasDynamicOffset: true },
        },
      ],
    });
    target = device.createTexture({
      format: 'rgba8unorm',
      size: { width: 8, height: 8 },
      usage: ['render-attachment', 'sampled'],
    });
    depth = device.createTexture({
      format: 'depth24plus',
      size: { width: 8, height: 8 },
      usage: ['render-attachment'],
    });
  });

  describe('render pipelines', () => {
    it('binds every semantic and instance attribute location before linking', () => {
      device.createRenderPipeline(describePipeline());

      const bindings = recording
        .callsTo('bindAttribLocation')
        .map((call) => [call.args[2], call.args[1]]);
      const link = recording.calls.findIndex(
        (call) => call.name === 'linkProgram',
      );
      const lastBinding = recording.calls.findLastIndex(
        (call) => call.name === 'bindAttribLocation',
      );

      expect(bindings).toEqual([
        ...Object.entries(vertexSemanticLocations).map(
          ([semantic, location]) => [`a_${semantic}`, location],
        ),
        ['a_instanceTint', 12],
      ]);
      expect(lastBinding).toBeLessThan(link);
    });

    it("gives uniform blocks their slot's binding points and samplers their units, once", () => {
      device.createRenderPipeline(describePipeline());

      expect(
        recording
          .callsTo('uniformBlockBinding')
          .map((call) => call.args.slice(1)),
      ).toEqual([
        [0, 4],
        [1, 12],
      ]);
      expect(
        recording
          .callsTo('uniform1i')
          .map((call) => [
            (call.args[0] as { name: string }).name,
            call.args[1],
          ]),
      ).toEqual([
        ['u_baseColor', 0],
        ['u_emissive', 1],
      ]);
    });

    it('inserts defines and the draw id after the version line', () => {
      device.createRenderPipeline(
        describePipeline({
          shaders: {
            vertex: vertexShader,
            fragment: fragmentShader,
            // eslint-disable-next-line @typescript-eslint/naming-convention -- GLSL macro names
            defines: { HAS_EMISSIVE: true, COUNT: 3 },
          },
        }),
      );

      const [vertexShaderObject] = recording
        .callsTo('shaderSource')
        .map((call) => call.args[0]);

      expect(
        recording.shaderSource(vertexShaderObject).split('\n').slice(0, 4),
      ).toEqual([
        '#version 300 es',
        '#define HAS_EMISSIVE 1',
        '#define COUNT 3',
        '#define FORGE_DRAW_ID 0',
      ]);
    });

    it('returns the same pipeline for an equal descriptor, and shares the program between pipelines', () => {
      const first = device.createRenderPipeline(describePipeline());
      const same = device.createRenderPipeline(describePipeline());
      const culledFront = device.createRenderPipeline(
        describePipeline({ primitive: { cullMode: 'front' } }),
      );

      expect(same).toBe(first);
      expect(culledFront).not.toBe(first);
      expect(recording.callsTo('linkProgram')).toHaveLength(1);
    });

    it('rejects loose uniforms and samplers no layout names', () => {
      expect(() =>
        device.createRenderPipeline(
          describePipeline({
            shaders: {
              vertex: vertexShader,
              fragment: fragmentShader.replace(
                'out vec4 color;',
                'uniform vec4 u_tint;\nout vec4 color;',
              ),
            },
          }),
        ),
      ).toThrow(/"u_tint" isn't in a uniform block/);
      expect(() =>
        device.createRenderPipeline(
          describePipeline({
            bindGroupLayouts: [
              device.createBindGroupLayout({ entries: [] }),
              viewLayout,
              device.createBindGroupLayout({ entries: [] }),
              drawLayout,
            ],
          }),
        ),
      ).toThrow(
        /"u_baseColor" is a sampler that none of its bind group layouts names/,
      );
      expect(recording.callsTo('deleteProgram')).toHaveLength(2);
    });

    it("rejects a sampler whose type doesn't match its binding", () => {
      const cubeLayout = device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: ['fragment'],
            texture: { name: 'u_baseColor', viewDimension: 'cube' },
          },
          {
            binding: 1,
            visibility: ['fragment'],
            texture: { name: 'u_emissive' },
          },
        ],
      });

      expect(() =>
        device.createRenderPipeline(
          describePipeline({
            bindGroupLayouts: [
              device.createBindGroupLayout({ entries: [] }),
              viewLayout,
              cubeLayout,
              drawLayout,
            ],
          }),
        ),
      ).toThrow(/doesn't match its binding/);
    });

    it("rejects pipelines whose textures exceed a stage's budget", () => {
      const { renderContext } = createRecordingRenderContext({
        limits: new Map([[glc.GL_MAX_TEXTURE_IMAGE_UNITS, 1]]),
      });
      const small = renderContext.device;
      const layout = small.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: ['fragment'],
            texture: { name: 'u_baseColor' },
          },
          {
            binding: 1,
            visibility: ['fragment'],
            texture: { name: 'u_emissive' },
          },
        ],
      });

      expect(() =>
        small.createRenderPipeline({
          shaders: { vertex: vertexShader, fragment: fragmentShader },
          targets: [{ format: 'rgba8unorm' }],
          bindGroupLayouts: [layout],
        }),
      ).toThrow(/samples 2 textures in the fragment stage.*allows 1/);
    });

    it('rejects alpha-to-coverage without an alpha target at location 0', () => {
      expect(() =>
        device.createRenderPipeline(
          describePipeline({
            targets: [{ format: 'rg16float' }],
            multisample: { count: 4, alphaToCoverage: true },
          }),
        ),
      ).toThrow(/alpha-to-coverage/);
      expect(() =>
        device.createRenderPipeline(
          describePipeline({
            targets: [],
            multisample: { alphaToCoverage: true },
          }),
        ),
      ).toThrow(/alpha-to-coverage/);
    });

    it('needs OES_draw_buffers_indexed for targets that blend differently', () => {
      expect(() =>
        device.createRenderPipeline(
          describePipeline({
            targets: [
              { format: 'rgba8unorm', blend: blendStates.premultipliedOver },
              { format: 'rgba8unorm' },
            ],
          }),
        ),
      ).toThrow(/OES_draw_buffers_indexed/);
    });

    it('rejects named attributes outside the per-instance locations, and repeated locations', () => {
      expect(() =>
        device.createRenderPipeline(
          describePipeline({
            vertexBuffers: [
              {
                stride: 4,
                attributes: [
                  {
                    name: 'a_extra',
                    shaderLocation: 3,
                    format: 'float32',
                    offset: 0,
                  },
                ],
              },
            ],
          }),
        ),
      ).toThrow(/locations 8 to 15/);
      expect(() =>
        device.createRenderPipeline(
          describePipeline({
            vertexBuffers: [
              {
                stride: 24,
                attributes: [
                  { semantic: 'position', format: 'float32x3', offset: 0 },
                  { semantic: 'position', format: 'float32x3', offset: 12 },
                ],
              },
            ],
          }),
        ),
      ).toThrow(/twice/);
    });
  });

  describe('bind groups', () => {
    it("rejects a texture whose format can't be filtered in a float binding", () => {
      const { renderContext } = createRecordingRenderContext({
        extensions: [],
      });
      const bare = renderContext.device;
      const layout = bare.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: ['fragment'], texture: { name: 'u_data' } },
        ],
      });
      const floatTexture = bare.createTexture({
        format: 'r32float',
        size: { width: 1, height: 1 },
        usage: ['sampled'],
      });

      expect(() =>
        bare.createBindGroup({
          layout,
          entries: [
            {
              binding: 0,
              texture: floatTexture,
              sampler: bare.createSampler(),
            },
          ],
        }),
      ).toThrow(/unfilterable-float/);
    });

    it('needs a nearest sampler for a depth texture read without comparison', () => {
      const depthTexture = device.createTexture({
        format: 'depth32float',
        size: { width: 1, height: 1 },
        usage: ['sampled'],
      });
      const raw = device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: ['fragment'],
            texture: { name: 'u_depth', sampleType: 'depth' },
          },
        ],
      });
      const comparison = device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: ['fragment'],
            texture: {
              name: 'u_shadow',
              sampleType: 'depth',
              samplerType: 'comparison',
            },
          },
        ],
      });

      expect(() =>
        device.createBindGroup({
          layout: raw,
          entries: [
            {
              binding: 0,
              texture: depthTexture,
              sampler: device.createSampler({ magFilter: 'linear' }),
            },
          ],
        }),
      ).toThrow(/'non-filtering' sampler/);
      expect(() =>
        device.createBindGroup({
          layout: comparison,
          entries: [
            {
              binding: 0,
              texture: depthTexture,
              sampler: device.createSampler(),
            },
          ],
        }),
      ).toThrow(/'comparison' sampler/);

      device.createBindGroup({
        layout: raw,
        entries: [
          {
            binding: 0,
            texture: depthTexture,
            sampler: device.createSampler(),
          },
        ],
      });
      device.createBindGroup({
        layout: comparison,
        entries: [
          {
            binding: 0,
            texture: depthTexture,
            sampler: device.createSampler({ compare: 'less' }),
          },
        ],
      });
    });

    it('rejects unaligned or misused buffer ranges and missing bindings', () => {
      const uniform = device.createBuffer({ usage: 'uniform', size: 1024 });

      expect(() =>
        device.createBindGroup({
          layout: viewLayout,
          entries: [{ binding: 0, buffer: uniform, offset: 64, size: 64 }],
        }),
      ).toThrow(/multiple of 256/);
      expect(() =>
        device.createBindGroup({
          layout: viewLayout,
          entries: [
            {
              binding: 0,
              buffer: device.createBuffer({ usage: 'vertex', size: 64 }),
            },
          ],
        }),
      ).toThrow(/'uniform' buffer/);
      expect(() =>
        device.createBindGroup({ layout: viewLayout, entries: [] }),
      ).toThrow(/fill each/);
    });

    it('rejects layouts with more than four uniform blocks or a filtering depth binding', () => {
      expect(() =>
        device.createBindGroupLayout({
          entries: [0, 1, 2, 3, 4].map((binding) => ({
            binding,
            visibility: ['vertex' as const],
            buffer: { name: `Block${binding}` },
          })),
        }),
      ).toThrow(/at most 4/);
      expect(() =>
        device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: ['fragment'],
              texture: {
                name: 'u_depth',
                sampleType: 'depth',
                samplerType: 'filtering',
              },
            },
          ],
        }),
      ).toThrow(/can't be filtered/);
    });
  });

  describe('render passes', () => {
    const setUpDraw = () => {
      const pipeline = device.createRenderPipeline(describePipeline());
      const viewBuffer = device.createBuffer({ usage: 'uniform', size: 256 });
      const drawBuffer = device.createBuffer({ usage: 'uniform', size: 1024 });
      const sampler = device.createSampler();
      const texture = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 1, height: 1 },
        usage: ['sampled'],
      });
      const viewGroup = device.createBindGroup({
        layout: viewLayout,
        entries: [{ binding: 0, buffer: viewBuffer }],
      });
      const materialGroup = device.createBindGroup({
        layout: materialLayout,
        entries: [
          { binding: 0, texture, sampler },
          { binding: 1, texture, sampler },
        ],
      });
      const drawGroup = device.createBindGroup({
        layout: drawLayout,
        entries: [{ binding: 0, buffer: drawBuffer, size: 64 }],
      });
      const frameGroup = device.createBindGroup({
        layout: device.createBindGroupLayout({ entries: [] }),
        entries: [],
      });
      const positions = device.createBuffer({ usage: 'vertex', size: 36 });
      const instances = device.createBuffer({ usage: 'vertex', size: 4 });
      const indices = device.createBuffer({ usage: 'index', size: 8 });
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: target,
            loadOp: 'clear',
            clearValue: [0, 0, 0, 1],
            storeOp: 'store',
          },
        ],
        depthStencilAttachment: {
          view: depth,
          depthLoadOp: 'clear',
          depthStoreOp: 'discard',
        },
      });

      pass.setPipeline(pipeline);
      pass.setBindGroup(0, frameGroup);
      pass.setBindGroup(1, viewGroup);
      pass.setBindGroup(2, materialGroup);
      pass.setBindGroup(3, drawGroup, [0]);
      pass.setVertexBuffer(0, positions);
      pass.setVertexBuffer(1, instances);
      pass.setIndexBuffer(indices, 'uint16');

      return {
        encoder,
        pass,
        pipeline,
        viewGroup,
        materialGroup,
        drawGroup,
        indices,
      };
    };

    it('clears its attachments and sets the viewport when it begins', () => {
      recording.clearCalls();
      setUpDraw();

      expect(
        recording.callsTo('clearBufferfv').map((call) => call.args),
      ).toEqual([
        [glc.GL_COLOR, 0, [0, 0, 0, 1]],
        [glc.GL_DEPTH, 0, [1]],
      ]);
      expect(recording.state.viewport).toEqual([0, 0, 8, 8]);
      expect(recording.callsTo('drawBuffers')[0].args).toEqual([
        [glc.GL_COLOR_ATTACHMENT0],
      ]);
    });

    it('draws indexed, applying the pipeline, bind groups and vertex array', () => {
      const { pass } = setUpDraw();

      pass.drawIndexed(3, 2, 1);

      const state = recording.state;

      expect(recording.callsTo('drawElementsInstanced')[0].args).toEqual([
        glc.GL_TRIANGLES,
        3,
        glc.GL_UNSIGNED_SHORT,
        2,
        2,
      ]);
      expect(state.enabled).toEqual(
        new Set([glc.GL_CULL_FACE, glc.GL_DEPTH_TEST, glc.GL_BLEND]),
      );
      expect(state.depthFunc).toBe(glc.GL_LEQUAL);
      expect(state.blendFunc).toEqual([
        glc.GL_ONE,
        glc.GL_ONE_MINUS_SRC_ALPHA,
        glc.GL_ONE,
        glc.GL_ONE_MINUS_SRC_ALPHA,
      ]);
      expect([...state.uniformBuffers.keys()].sort((a, b) => a - b)).toEqual([
        4, 12,
      ]);
      expect(
        recording.callsTo('vertexAttribDivisor').map((call) => call.args),
      ).toEqual([
        [0, 0],
        [12, 1],
      ]);
      expect(recording.callsTo('vertexAttribPointer')[1].args).toEqual([
        12,
        4,
        glc.GL_UNSIGNED_BYTE,
        true,
        4,
        0,
      ]);
    });

    it('issues no GL calls when the same pipeline, bind groups and buffers are set again', () => {
      const { pass, pipeline, viewGroup, materialGroup, drawGroup, indices } =
        setUpDraw();

      pass.drawIndexed(3);
      recording.clearCalls();

      for (let draw = 0; draw < 3; draw++) {
        pass.setPipeline(pipeline);
        pass.setBindGroup(1, viewGroup);
        pass.setBindGroup(2, materialGroup);
        pass.setBindGroup(3, drawGroup, [0]);
        pass.setIndexBuffer(indices, 'uint16');
        pass.drawIndexed(3);
      }

      expect(recording.calls.map((call) => call.name)).toEqual([
        'drawElementsInstanced',
        'drawElementsInstanced',
        'drawElementsInstanced',
      ]);
    });

    it('binds its textures again after a texture is written during the pass', () => {
      const { pass } = setUpDraw();
      const unit0 = `0:${glc.GL_TEXTURE_2D}`;

      pass.drawIndexed(3);

      const bound = recording.state.textures.get(unit0);
      const written = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 1, height: 1 },
        usage: ['sampled', 'copy-destination'],
      });

      written.write(new Uint8Array(4));

      expect(recording.state.textures.get(unit0)).not.toBe(bound);

      pass.drawIndexed(3);

      expect(recording.state.textures.get(unit0)).toBe(bound);
    });

    it('rebinds only the range of a bind group whose dynamic offset changed', () => {
      const { pass, drawGroup } = setUpDraw();

      pass.drawIndexed(3);
      recording.clearCalls();
      pass.setBindGroup(3, drawGroup, [256]);
      pass.drawIndexed(3);

      expect(recording.calls.map((call) => call.name)).toEqual([
        'bindBufferRange',
        'drawElementsInstanced',
      ]);
      expect(recording.callsTo('bindBufferRange')[0].args.slice(1, 5)).toEqual([
        12,
        expect.anything(),
        256,
        64,
      ]);
    });

    it('rejects dynamic offsets that are unaligned or of the wrong count', () => {
      const { pass, drawGroup } = setUpDraw();

      expect(() => {
        pass.setBindGroup(3, drawGroup, [64]);
      }).toThrow(/multiple of 256/);
      expect(() => {
        pass.setBindGroup(3, drawGroup);
      }).toThrow(/needs 1 dynamic offsets/);
    });

    it("rejects a pipeline whose attachments differ from the pass's", () => {
      const { pass } = setUpDraw();
      const other = device.createRenderPipeline(
        describePipeline({ depthStencil: undefined }),
      );

      expect(() => {
        pass.setPipeline(other);
      }).toThrow(
        /renders to rgba8unorm\|\|1, but render pass "" has rgba8unorm\|depth24plus\|1/,
      );
    });

    it('rejects a draw with a missing bind group or vertex buffer', () => {
      const pipeline = device.createRenderPipeline(describePipeline());
      const pass = device.createCommandEncoder().beginRenderPass({
        colorAttachments: [{ view: target, loadOp: 'load', storeOp: 'store' }],
        depthStencilAttachment: { view: depth },
      });

      pass.setPipeline(pipeline);

      expect(() => {
        pass.draw(3);
      }).toThrow(
        /needs a bind group with layout "" in slot 0, received no bind group/,
      );
    });

    it('discards attachments with storeOp discard and leaves shared state as other code expects', () => {
      const { pass, encoder } = setUpDraw();

      pass.drawIndexed(3);
      pass.end();

      expect(recording.callsTo('invalidateFramebuffer')[0].args).toEqual([
        glc.GL_DRAW_FRAMEBUFFER,
        [glc.GL_DEPTH_ATTACHMENT],
      ]);
      expect(recording.state.enabled.size).toBe(0);
      expect(recording.state.vertexArray).toBeNull();
      expect(
        [...recording.state.samplers.values()].every(
          (sampler) => sampler === null,
        ),
      ).toBe(true);
      expect(recording.state.blendEquation).toEqual([
        glc.GL_FUNC_ADD,
        glc.GL_FUNC_ADD,
      ]);
      expect(recording.state.colorMask).toEqual([true, true, true, true]);

      device.submit([encoder.finish()]);
    });

    it('resolves a multisampled attachment into its resolve target when it ends', () => {
      const multisampled = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 8, height: 8 },
        sampleCount: 4,
        usage: ['render-attachment'],
      });
      const pass = device.createCommandEncoder().beginRenderPass({
        colorAttachments: [
          {
            view: multisampled,
            resolveTarget: target,
            loadOp: 'clear',
            storeOp: 'discard',
          },
        ],
      });

      recording.clearCalls();
      pass.end();

      expect(recording.callsTo('blitFramebuffer')[0].args).toEqual([
        0,
        0,
        8,
        8,
        0,
        0,
        8,
        8,
        glc.GL_COLOR_BUFFER_BIT,
        glc.GL_NEAREST,
      ]);
      expect(recording.callsTo('readBuffer')[0].args).toEqual([
        glc.GL_COLOR_ATTACHMENT0,
      ]);
      expect(recording.callsTo('invalidateFramebuffer')[0].args).toEqual([
        glc.GL_DRAW_FRAMEBUFFER,
        [glc.GL_COLOR_ATTACHMENT0],
      ]);
    });

    it("rejects attachments that don't fit together", () => {
      const small = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 4, height: 4 },
        usage: ['render-attachment'],
      });
      const encoder = device.createCommandEncoder();

      expect(() =>
        encoder.beginRenderPass({
          colorAttachments: [
            { view: target, loadOp: 'load', storeOp: 'store' },
          ],
          depthStencilAttachment: { view: small },
        }),
      ).toThrow(/same size and sample count/);
      expect(() =>
        encoder.beginRenderPass({
          colorAttachments: [
            {
              view: target,
              resolveTarget: small,
              loadOp: 'load',
              storeOp: 'store',
            },
          ],
        }),
      ).toThrow(/must be multisampled/);
      expect(() =>
        encoder.beginRenderPass({
          colorAttachments: [
            { view: device.canvasTexture, loadOp: 'load', storeOp: 'store' },
          ],
          depthStencilAttachment: { view: depth },
        }),
      ).toThrow(/same size|canvas/);
    });

    it('draws into the canvas through the default framebuffer', () => {
      const pass = device.createCommandEncoder().beginRenderPass({
        colorAttachments: [
          { view: device.canvasTexture, loadOp: 'clear', storeOp: 'store' },
        ],
      });

      pass.end();

      expect(recording.state.drawFramebuffer).toBeNull();
      expect(recording.state.viewport).toEqual([0, 0, 300, 150]);
    });

    it('allows one open pass at a time, and submits a finished command buffer once', () => {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: target, loadOp: 'load', storeOp: 'store' }],
      });

      expect(() => encoder.finish()).toThrow(/hasn't ended/);
      expect(() =>
        device.createCommandEncoder().beginRenderPass({
          colorAttachments: [
            { view: target, loadOp: 'load', storeOp: 'store' },
          ],
        }),
      ).toThrow(/still open/);

      pass.end();

      expect(() => {
        pass.draw(3);
      }).toThrow(/has ended/);

      const commands = encoder.finish();

      device.submit([commands]);

      expect(() => {
        device.submit([commands]);
      }).toThrow(/already submitted/);
    });

    it('applies everything again after resetState inside a pass', () => {
      const { pass } = setUpDraw();

      pass.drawIndexed(3);
      device.resetState();
      recording.clearCalls();
      pass.drawIndexed(3);

      const names = recording.calls.map((call) => call.name);

      expect(names).toContain('useProgram');
      expect(names).toContain('bindBufferRange');
      expect(names).toContain('bindVertexArray');
    });
  });
});
