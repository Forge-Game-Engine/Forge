import {
  bindGroupSlots,
  blendStates,
  createCanvas,
  createRenderContext,
  GpuBindGroup,
  GpuDevice,
  GpuRenderPipeline,
  GpuTexture,
} from '../../../src/rendering/index.js';
import {
  CanvasPixels,
  fullscreenTriangleVertexShader,
  readCanvas,
  Rgba,
} from './gpu-device-helpers.js';
import { CreateScene, SceneHandle } from './scene.js';

/** Each offscreen view's size, and its pane's on the canvas, in pixels. */
const viewSize = 128;
const paneGap = 12;

const meshVertexShader = `#version 300 es
in vec3 a_position;
in vec4 a_color0;
uniform ForgeDraw { vec4 offsetScale; };
out vec4 v_color;
void main() {
  v_color = a_color0;
  gl_Position = vec4(a_position.xy * offsetScale.zw + offsetScale.xy, a_position.z, 1.0);
}
`;

const meshFragmentShader = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 color;
void main() {
  color = v_color;
}
`;

const presentFragmentShader = `#version 300 es
precision highp float;
uniform sampler2D u_scene;
in vec2 v_uv;
out vec4 color;
void main() {
  color = texture(u_scene, v_uv);
}
`;

/** A quad's four corners, rotated by `angle`, at depth `z`. */
function quad(halfSize: number, angle: number, z: number): number[] {
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return corners.flatMap(([x, y]) => [
    (x * cos - y * sin) * halfSize,
    (x * sin + y * cos) * halfSize,
    z,
  ]);
}

/**
 * Two quads in one indexed mesh: a near green one, turned so its edges
 * aren't pixel-aligned, and a larger far red one behind it. Positions are
 * `float32x3` and colors `unorm8x4`, interleaved.
 */
function createMesh(device: GpuDevice) {
  const positions = [...quad(0.35, Math.PI / 6, -0.5), ...quad(0.6, 0, 0.5)];
  const colors = [
    ...Array<number[]>(4).fill([0, 255, 0, 255]),
    ...Array<number[]>(4).fill([255, 0, 0, 255]),
  ];
  const stride = 16;
  const vertices = new ArrayBuffer(stride * 8);
  const floats = new Float32Array(vertices);
  const bytes = new Uint8Array(vertices);

  for (let vertex = 0; vertex < 8; vertex++) {
    floats.set(
      positions.slice(vertex * 3, vertex * 3 + 3),
      (vertex * stride) / 4,
    );
    bytes.set(colors[vertex], vertex * stride + 12);
  }

  return {
    stride,
    vertexBuffer: device.createBuffer({
      usage: 'vertex',
      size: vertices.byteLength,
      data: bytes,
      label: 'mesh vertices',
    }),
    indexBuffer: device.createBuffer({
      usage: 'index',
      size: 24,
      data: new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]),
      label: 'mesh indices',
    }),
  };
}

/** One offscreen view: its targets and the pipeline it draws with. */
interface View {
  readonly color: GpuTexture;
  readonly resolved: GpuTexture | null;
  readonly depth: GpuTexture;
  readonly pipeline: GpuRenderPipeline;
}

/** What `measure` reads from one pane. */
export interface PaneMeasurement {
  /** Where both quads overlap: the near one's color with a depth test. */
  readonly overlap: Rgba;

  /** Inside only the far quad. */
  readonly farOnly: Rgba;

  /** Outside both. */
  readonly background: Rgba;

  /**
   * How many pixels are a blend of those three colors, as multisampled
   * edges are.
   */
  readonly blendedPixels: number;
}

/** What `measure` returns. */
export interface DrawMeasurement {
  /** Drawn with 4x MSAA and a depth test, then resolved. */
  readonly multisampled: PaneMeasurement;

  /** Drawn with one sample and a depth test. */
  readonly singleSampled: PaneMeasurement;

  /** Drawn with one sample and no depth test, as a control. */
  readonly noDepthTest: PaneMeasurement;

  /**
   * The center of a texture created and written while the context was
   * lost, or `null` before one exists.
   */
  readonly createdWhileLost: Rgba | null;
}

/** The handle `gpu-device-draw.spec.ts` drives. */
export interface DrawSceneHandle extends SceneHandle {
  /** Reads every pane. Call in the same task as `step()`. */
  measure(): DrawMeasurement;

  /** Loses the context through `WEBGL_lose_context`. */
  loseContext(): void;

  /** Restores the context through `WEBGL_lose_context`. */
  restoreContext(): void;

  /** How many times `onContextRestored` was raised. */
  restoredCount(): number;

  /** Creates and writes a green texture, shown in a fourth pane. */
  createTextureWhileLost(): void;
}

/**
 * Builds a scene that draws an indexed mesh, depth-tested, into offscreen
 * textures through the GPU device only: once with 4x MSAA resolved into a
 * texture, once single-sampled, and once without a depth test as a
 * control. A second pass presents each view into its own pane of the
 * canvas. Per-draw offsets come from a staging buffer through a dynamic
 * offset.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): DrawSceneHandle => {
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });
  const { device, gl } = renderContext;
  const loseContextExtension = gl.getExtension('WEBGL_lose_context');

  if (!loseContextExtension) {
    throw new Error('WEBGL_lose_context is not available.');
  }

  let restored = 0;

  renderContext.onContextRestored.registerListener(() => {
    restored++;
  });

  const empty = device.createBindGroupLayout({ entries: [] });
  const emptyGroup = device.createBindGroup({ layout: empty, entries: [] });
  const drawLayout = device.createBindGroupLayout({
    label: 'draw',
    entries: [
      {
        binding: 0,
        visibility: ['vertex'],
        buffer: { name: 'ForgeDraw', hasDynamicOffset: true },
      },
    ],
  });
  const presentLayout = device.createBindGroupLayout({
    label: 'present',
    entries: [
      { binding: 0, visibility: ['fragment'], texture: { name: 'u_scene' } },
    ],
  });
  const mesh = createMesh(device);
  const drawData = device.createStagingBuffer({ usage: 'uniform' });
  const drawGroup = device.createBindGroup({
    layout: drawLayout,
    entries: [{ binding: 0, buffer: drawData.buffer, size: 16 }],
  });

  const meshPipeline = (sampleCount: number, depthTest: boolean) =>
    device.createRenderPipeline({
      label: `mesh x${sampleCount}${depthTest ? '' : ' no depth'}`,
      shaders: { vertex: meshVertexShader, fragment: meshFragmentShader },
      vertexBuffers: [
        {
          stride: mesh.stride,
          attributes: [
            { semantic: 'position', format: 'float32x3', offset: 0 },
            { semantic: 'color0', format: 'unorm8x4', offset: 12 },
          ],
        },
      ],
      primitive: { cullMode: 'back' },
      depthStencil: {
        format: 'depth24plus',
        depthWrite: depthTest,
        depthCompare: depthTest ? 'less' : 'always',
      },
      targets: [{ format: 'rgba8unorm', blend: blendStates.replace }],
      multisample: { count: sampleCount },
      bindGroupLayouts: [empty, empty, empty, drawLayout],
    });

  const createView = (sampleCount: number, depthTest: boolean): View => {
    const size = { width: viewSize, height: viewSize };
    const single = device.createTexture({
      format: 'rgba8unorm',
      size,
      usage: ['render-attachment', 'sampled'],
    });

    return {
      color:
        sampleCount > 1
          ? device.createTexture({
              format: 'rgba8unorm',
              size,
              sampleCount,
              usage: ['render-attachment'],
            })
          : single,
      resolved: sampleCount > 1 ? single : null,
      depth: device.createTexture({
        format: 'depth24plus',
        size,
        sampleCount,
        usage: ['render-attachment'],
      }),
      pipeline: meshPipeline(sampleCount, depthTest),
    };
  };

  const views = [
    createView(4, true),
    createView(1, true),
    createView(1, false),
  ];
  const presentPipeline = device.createRenderPipeline({
    label: 'present',
    shaders: {
      vertex: fullscreenTriangleVertexShader,
      fragment: presentFragmentShader,
    },
    targets: [{ format: 'rgba8unorm' }],
    bindGroupLayouts: [presentLayout],
  });
  const presentSampler = device.createSampler();
  const presentGroups: GpuBindGroup[] = views.map((view) =>
    device.createBindGroup({
      layout: presentLayout,
      entries: [
        {
          binding: 0,
          texture: view.resolved ?? view.color,
          sampler: presentSampler,
        },
      ],
    }),
  );
  let lostTextureGroup: GpuBindGroup | null = null;

  const drawView = (
    view: View,
    encoder: ReturnType<GpuDevice['createCommandEncoder']>,
    offsets: { near: number; far: number },
  ): void => {
    const pass = encoder.beginRenderPass({
      label: view.pipeline.label,
      colorAttachments: [
        {
          view: view.color,
          resolveTarget: view.resolved ?? undefined,
          loadOp: 'clear',
          clearValue: [0, 0, 0, 1],
          storeOp: view.resolved ? 'discard' : 'store',
        },
      ],
      depthStencilAttachment: {
        view: view.depth,
        depthLoadOp: 'clear',
        depthClearValue: 1,
        depthStoreOp: 'discard',
      },
    });

    pass.setPipeline(view.pipeline);
    pass.setBindGroup(bindGroupSlots.frame, emptyGroup);
    pass.setBindGroup(bindGroupSlots.view, emptyGroup);
    pass.setBindGroup(bindGroupSlots.material, emptyGroup);
    pass.setVertexBuffer(0, mesh.vertexBuffer);
    pass.setIndexBuffer(mesh.indexBuffer, 'uint16');
    // Near first, so the far quad drawn after it fails the depth test where
    // they overlap.
    pass.setBindGroup(bindGroupSlots.draw, drawGroup, [offsets.near]);
    pass.drawIndexed(6);
    pass.setBindGroup(bindGroupSlots.draw, drawGroup, [offsets.far]);
    pass.drawIndexed(6, 1, 6);
    pass.end();
  };

  const paneLeft = (index: number): number => index * (viewSize + paneGap);

  const measurePane = (
    pixels: CanvasPixels,
    index: number,
  ): PaneMeasurement => {
    const left = paneLeft(index);
    // Clip-space x and y to a pixel of the pane, from the canvas's top.
    const at = (x: number, y: number): Rgba =>
      pixels.at(
        left + Math.floor(((x + 1) / 2) * viewSize),
        Math.floor(((1 - y) / 2) * viewSize),
      );
    const overlap = at(0, 0);
    const farOnly = at(0.5, 0.5);
    const background = at(0.85, 0.85);
    const references = [overlap, farOnly, background];
    let blendedPixels = 0;

    for (let y = 0; y < viewSize; y++) {
      for (let x = 0; x < viewSize; x++) {
        const color = pixels.at(left + x, y);
        const nearest = Math.min(
          ...references.map((reference) =>
            Math.hypot(
              color[0] - reference[0],
              color[1] - reference[1],
              color[2] - reference[2],
            ),
          ),
        );

        if (nearest > 40) {
          blendedPixels++;
        }
      }
    }

    return { overlap, farOnly, background, blendedPixels };
  };

  return {
    step(): void {
      // Per-draw data is written before the passes that read it; the
      // staging buffer is uploaded when the first of them begins.
      drawData.reset();

      const offsets = {
        near: drawData.allocate(16),
        far: drawData.allocate(16),
      };

      drawData.float32.set([0, 0, 1, 1], offsets.near / 4);
      drawData.float32.set([0, 0, 1, 1], offsets.far / 4);

      const encoder = device.createCommandEncoder({ label: 'frame' });

      for (const view of views) {
        drawView(view, encoder, offsets);
      }

      const present = encoder.beginRenderPass({
        label: 'present',
        colorAttachments: [
          {
            view: device.canvasTexture,
            loadOp: 'clear',
            clearValue: [0.2, 0.2, 0.2, 1],
            storeOp: 'store',
          },
        ],
      });
      const groups = lostTextureGroup
        ? [...presentGroups, lostTextureGroup]
        : presentGroups;

      present.setPipeline(presentPipeline);
      groups.forEach((group, index) => {
        present.setViewport(
          paneLeft(index),
          renderContext.height - viewSize,
          viewSize,
          viewSize,
          0,
          1,
        );
        present.setBindGroup(0, group);
        present.draw(3);
      });
      present.end();
      device.submit([encoder.finish()]);
    },

    measure(): DrawMeasurement {
      const pixels = readCanvas(renderContext);

      return {
        multisampled: measurePane(pixels, 0),
        singleSampled: measurePane(pixels, 1),
        noDepthTest: measurePane(pixels, 2),
        createdWhileLost: lostTextureGroup
          ? pixels.at(paneLeft(3) + viewSize / 2, viewSize / 2)
          : null,
      };
    },

    loseContext(): void {
      loseContextExtension.loseContext();
    },

    restoreContext(): void {
      loseContextExtension.restoreContext();
    },

    restoredCount(): number {
      return restored;
    },

    createTextureWhileLost(): void {
      const texture = device.createTexture({
        format: 'rgba8unorm',
        size: { width: 1, height: 1 },
        usage: ['sampled', 'copy-destination'],
      });

      texture.write(new Uint8Array([0, 255, 0, 255]));
      lostTextureGroup = device.createBindGroup({
        layout: presentLayout,
        entries: [{ binding: 0, texture, sampler: presentSampler }],
      });
    },
  };
};
