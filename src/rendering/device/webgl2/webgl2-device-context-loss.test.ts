import { beforeEach, describe, expect, it } from 'vitest';
import {
  createRecordingRenderContext,
  RecordingRenderContext,
} from '../../test-helpers/recording-gl.js';
import type { GpuDevice } from '../gpu-device.js';
import * as glc from './gl-constants.js';

const vertexShader = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
out vec4 color;
void main() { color = texture(u_texture, vec2(0.5)); }
`;

describe('the WebGL2 GPU device across a lost context', () => {
  let context: RecordingRenderContext;
  let device: GpuDevice;

  beforeEach(() => {
    context = createRecordingRenderContext();
    device = context.renderContext.device;
  });

  it('records resources created while the context is lost, and creates them on restore', () => {
    context.loseContext();
    context.recording.clearCalls();

    const buffer = device.createBuffer({
      usage: 'vertex',
      size: 8,
      data: new Float32Array([1, 2]),
    });
    const texture = device.createTexture({
      format: 'rgba8unorm',
      size: { width: 1, height: 1 },
      usage: ['sampled', 'copy-destination'],
    });
    const layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: ['fragment'],
          texture: { name: 'u_texture' },
        },
      ],
    });

    texture.write(new Uint8Array([1, 2, 3, 4]));
    buffer.write(4, new Float32Array([5]));
    device.createSampler({ magFilter: 'linear' });
    device.createRenderPipeline({
      shaders: { vertex: vertexShader, fragment: fragmentShader },
      targets: [{ format: 'rgba8unorm' }],
      bindGroupLayouts: [layout],
    });

    const recorded = context.recording.calls.map((call) => call.name);

    expect(recorded.filter((name) => name !== 'isContextLost')).toEqual([]);

    context.restoreContext();

    const restored = context.recording.calls.map((call) => call.name);

    expect(restored).toContain('createSampler');
    expect(restored).toContain('texStorage2D');
    expect(restored).toContain('texSubImage2D');
    expect(restored).toContain('linkProgram');

    const [bufferData] = context.recording.callsTo('bufferData');

    expect([
      ...new Float32Array((bufferData.args[1] as Uint8Array).buffer),
    ]).toEqual([1, 5]);
  });

  it('recreates every resource that existed, with its contents', () => {
    const texture = device.createTexture({
      format: 'rgba8unorm',
      size: { width: 2, height: 2 },
      mipLevelCount: 2,
      usage: ['sampled', 'copy-destination'],
    });
    const whole = new Uint8Array(16);
    const corner = new Uint8Array(4);

    texture.write(whole);
    texture.write(corner, { size: { width: 1, height: 1 } });
    texture.generateMipmaps();

    context.loseContext();
    context.recording.clearCalls();
    context.restoreContext();

    const uploads = context.recording.callsTo('texSubImage2D');

    // The whole-level write comes back; the smaller one isn't kept.
    expect(uploads).toHaveLength(1);
    expect(uploads[0].args[8]).toBe(whole);
    expect(context.recording.callsTo('generateMipmap')).toHaveLength(1);
  });

  it("uploads a texture's restore source whole, including rows written only once", () => {
    const mirror = new Uint8Array(4 * 4 * 4);
    const texture = device.createTexture({
      format: 'rgba8unorm',
      size: { width: 4, height: 4 },
      usage: ['sampled', 'copy-destination'],
      restoreSource: mirror,
    });

    mirror.set([9, 9, 9, 9], 0);
    texture.write(mirror.subarray(0, 16), { size: { width: 4, height: 1 } });
    mirror.set([7, 7, 7, 7], 48);
    texture.write(mirror.subarray(48, 64), {
      origin: { y: 3 },
      size: { width: 4, height: 1 },
    });

    context.loseContext();
    context.recording.clearCalls();
    context.restoreContext();

    const uploads = context.recording.callsTo('texSubImage2D');

    expect(uploads).toHaveLength(1);
    expect(uploads[0].args.slice(0, 6)).toEqual([
      glc.GL_TEXTURE_2D,
      0,
      0,
      0,
      4,
      4,
    ]);
    expect(uploads[0].args[8]).toBe(mirror);
  });

  it("uploads a staging buffer's allocated range again before the next pass", () => {
    const staging = device.createStagingBuffer({ usage: 'uniform' });
    const target = device.createTexture({
      format: 'rgba8unorm',
      size: { width: 1, height: 1 },
      usage: ['render-attachment'],
    });
    const offset = staging.allocate(16);

    staging.float32[offset / 4] = 3;

    const beginPass = (): void => {
      device
        .createCommandEncoder()
        .beginRenderPass({
          colorAttachments: [
            { view: target, loadOp: 'load', storeOp: 'store' },
          ],
        })
        .end();
    };

    beginPass();
    context.loseContext();
    context.recording.clearCalls();
    context.restoreContext();
    beginPass();

    const upload = context.recording.callsTo('bufferSubData')[0];

    expect(upload.args[1]).toBe(0);
    expect((upload.args[2] as Uint8Array).byteLength).toBe(16);
  });

  it('draws nothing while the context is lost', () => {
    const target = device.createTexture({
      format: 'rgba8unorm',
      size: { width: 1, height: 1 },
      usage: ['render-attachment'],
    });

    context.loseContext();
    context.recording.clearCalls();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view: target, loadOp: 'clear', storeOp: 'store' }],
    });

    pass.draw(3);
    pass.end();
    device.submit([encoder.finish()]);

    expect(
      context.recording.calls.filter((call) => call.name !== 'isContextLost'),
    ).toEqual([]);
  });

  it('reports a resource that fails to restore without stopping the rest', () => {
    const failing = createRecordingRenderContext({
      compileError: (source) =>
        source.includes('BROKEN') ? 'syntax error' : null,
    });
    const failingDevice = failing.renderContext.device;
    const layout = failingDevice.createBindGroupLayout({ entries: [] });

    failing.loseContext();
    failingDevice.createRenderPipeline({
      shaders: {
        vertex: `${vertexShader}// BROKEN`,
        fragment: '#version 300 es\nvoid main() {}',
      },
      targets: [],
      bindGroupLayouts: [layout],
    });
    failingDevice.createTexture({
      format: 'rgba8unorm',
      size: { width: 1, height: 1 },
      usage: ['sampled'],
    });
    failing.recording.clearCalls();

    const errors: unknown[] = [];

    const captureError = (event: ErrorEvent): void => {
      event.preventDefault();
      errors.push(event.error);
    };

    window.addEventListener('error', captureError);
    failing.restoreContext();
    window.removeEventListener('error', captureError);

    expect(errors).toHaveLength(1);
    expect((errors[0] as AggregateError).errors[0]).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('failed to compile') as unknown,
      }),
    );
    expect(failing.recording.callsTo('texStorage2D')).toHaveLength(1);
  });
});
