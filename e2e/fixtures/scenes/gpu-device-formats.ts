import {
  createCanvas,
  createRenderContext,
  GpuBindGroup,
  GpuBindGroupLayout,
  GpuDevice,
  GpuRenderPipeline,
  GpuTexture,
  GpuTextureFormat,
} from '../../../src/rendering/index.js';
import {
  fullscreenTriangleVertexShader,
  readCanvas,
  Rgba,
} from './gpu-device-helpers.js';
import { CreateScene, SceneHandle } from './scene.js';

/** The size of each check's cell on the canvas, in pixels. */
const cellSize = 32;
const columns = 8;

const floatCheckShader = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform ForgeMaterial { vec4 expected; vec4 mask; vec4 params; };
out vec4 color;
void main() {
  vec4 value = texelFetch(u_texture, ivec2(0), int(params.y));
  bool ok = all(lessThanEqual(abs(value - expected) * mask, vec4(params.x)));
  color = ok ? vec4(0.0, 1.0, 0.0, 1.0) : vec4(1.0, 0.0, 0.0, 1.0);
}
`;

const uintCheckShader = `#version 300 es
precision highp float;
precision highp usampler2D;
uniform usampler2D u_texture;
uniform ForgeMaterial { uvec4 expected; uvec4 mask; };
out vec4 color;
void main() {
  uvec4 value = texelFetch(u_texture, ivec2(0), 0);
  bool ok = all(equal(value * mask, expected * mask));
  color = ok ? vec4(0.0, 1.0, 0.0, 1.0) : vec4(1.0, 0.0, 0.0, 1.0);
}
`;

const twoUnitDepthShader = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
uniform sampler2DShadow u_shadow;
uniform sampler2D u_depth;
out vec4 color;
void main() {
  float lit = texture(u_shadow, vec3(0.5, 0.5, 0.25));
  float depth = texelFetch(u_depth, ivec2(0), 0).r;
  bool ok = lit > 0.99 && abs(depth - 0.5) < 0.01;
  color = ok ? vec4(0.0, 1.0, 0.0, 1.0) : vec4(1.0, 0.0, 0.0, 1.0);
}
`;

const integerAttributeVertexShader = `#version 300 es
in uvec4 a_joints0;
flat out uvec4 v_joints;
void main() {
  v_joints = a_joints0;
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

const integerAttributeFragmentShader = `#version 300 es
precision highp float;
flat in uvec4 v_joints;
out vec4 color;
void main() {
  bool ok = all(equal(v_joints, uvec4(1u, 2u, 3u, 250u)));
  color = ok ? vec4(0.0, 1.0, 0.0, 1.0) : vec4(1.0, 0.0, 0.0, 1.0);
}
`;

type CheckKind = 'float' | 'uint' | 'depth';

/** One texture whose texel the shader compares with what was uploaded. */
interface TextureCheck {
  name: string;
  kind: CheckKind;
  format: GpuTextureFormat;
  data: ArrayBufferView | ImageData;
  expected: readonly number[];
  mask?: readonly number[];
  tolerance?: number;
  size?: number;
  mipLevel?: number;
  generateMipmaps?: boolean;
}

const srgbToLinear = (value: number): number => {
  const encoded = value / 255;

  return encoded <= 0.04045
    ? encoded / 12.92
    : Math.pow((encoded + 0.055) / 1.055, 2.4);
};

const rgba8 = [51, 102, 153, 204];
const rgba8Expected = rgba8.map((value) => value / 255);
const floats = [0.25, 0.5, 0.75, 1];
const uints = [7, 11, 13, 4000000000];

/** A BC1 block of solid green: two equal RGB565 colors, all indices 0. */
const solidGreenBc1 = new Uint8Array([0xe0, 0x07, 0xe0, 0x07, 0, 0, 0, 0]);

const textureChecks: TextureCheck[] = [
  {
    name: 'r8unorm',
    kind: 'float',
    format: 'r8unorm',
    data: new Uint8Array([51]),
    expected: [0.2, 0, 0, 0],
    mask: [1, 0, 0, 0],
  },
  {
    name: 'rg8unorm',
    kind: 'float',
    format: 'rg8unorm',
    data: new Uint8Array([51, 102]),
    expected: [0.2, 0.4, 0, 0],
    mask: [1, 1, 0, 0],
  },
  {
    name: 'rgba8unorm',
    kind: 'float',
    format: 'rgba8unorm',
    data: new Uint8Array(rgba8),
    expected: rgba8Expected,
  },
  {
    name: 'rgba8unorm-srgb',
    kind: 'float',
    format: 'rgba8unorm-srgb',
    data: new Uint8Array([188, 128, 64, 204]),
    expected: [srgbToLinear(188), srgbToLinear(128), srgbToLinear(64), 0.8],
  },
  {
    name: 'r16float',
    kind: 'float',
    format: 'r16float',
    data: new Float32Array([0.25]),
    expected: floats,
    mask: [1, 0, 0, 0],
  },
  {
    name: 'rg16float',
    kind: 'float',
    format: 'rg16float',
    data: new Float32Array([0.25, 0.5]),
    expected: floats,
    mask: [1, 1, 0, 0],
  },
  {
    name: 'rgba16float',
    kind: 'float',
    format: 'rgba16float',
    data: new Float32Array(floats),
    expected: floats,
  },
  {
    name: 'r32float',
    kind: 'float',
    format: 'r32float',
    data: new Float32Array([0.25]),
    expected: floats,
    mask: [1, 0, 0, 0],
  },
  {
    name: 'rg32float',
    kind: 'float',
    format: 'rg32float',
    data: new Float32Array([0.25, 0.5]),
    expected: floats,
    mask: [1, 1, 0, 0],
  },
  {
    name: 'rgba32float',
    kind: 'float',
    format: 'rgba32float',
    data: new Float32Array(floats),
    expected: floats,
  },
  {
    name: 'rg11b10ufloat',
    kind: 'float',
    format: 'rg11b10ufloat',
    data: new Float32Array([0.25, 0.5, 0.75]),
    expected: floats,
    mask: [1, 1, 1, 0],
  },
  {
    name: 'rgb10a2unorm',
    kind: 'float',
    format: 'rgb10a2unorm',
    data: new Uint32Array([
      (256 | (512 << 10) | (768 << 20) | (2 << 30)) >>> 0,
    ]),
    expected: [256 / 1023, 512 / 1023, 768 / 1023, 2 / 3],
  },
  {
    name: 'r32uint',
    kind: 'uint',
    format: 'r32uint',
    data: new Uint32Array([7]),
    expected: uints,
    mask: [1, 0, 0, 0],
  },
  {
    name: 'rg32uint',
    kind: 'uint',
    format: 'rg32uint',
    data: new Uint32Array([7, 11]),
    expected: uints,
    mask: [1, 1, 0, 0],
  },
  {
    name: 'rgba32uint',
    kind: 'uint',
    format: 'rgba32uint',
    data: new Uint32Array(uints),
    expected: uints,
  },
  {
    name: 'depth16unorm',
    kind: 'depth',
    format: 'depth16unorm',
    data: new Uint16Array([32768]),
    expected: [0.5, 0, 0, 0],
    mask: [1, 0, 0, 0],
  },
  {
    name: 'depth24plus',
    kind: 'depth',
    format: 'depth24plus',
    data: new Uint32Array([0x80000000]),
    expected: [0.5, 0, 0, 0],
    mask: [1, 0, 0, 0],
  },
  {
    name: 'depth24plus-stencil8',
    kind: 'depth',
    format: 'depth24plus-stencil8',
    data: new Uint32Array([0x80000000]),
    expected: [0.5, 0, 0, 0],
    mask: [1, 0, 0, 0],
  },
  {
    name: 'depth32float',
    kind: 'depth',
    format: 'depth32float',
    data: new Float32Array([0.5]),
    expected: [0.5, 0, 0, 0],
    mask: [1, 0, 0, 0],
  },
  {
    // An image is stored as authored: a translucent texel isn't
    // premultiplied, so its color comes back unchanged (as a normal map's
    // must).
    name: 'image-unchanged',
    kind: 'float',
    format: 'rgba8unorm',
    data: new ImageData(new Uint8ClampedArray([128, 255, 64, 10]), 1, 1),
    expected: [128 / 255, 1, 64 / 255, 10 / 255],
  },
  {
    // Level 1 of a 2x2 texture, half red and half blue, is their average.
    name: 'generated-mipmap',
    kind: 'float',
    format: 'rgba8unorm',
    size: 2,
    data: new Uint8Array([
      255, 0, 0, 255, 0, 0, 255, 255, 255, 0, 0, 255, 0, 0, 255, 255,
    ]),
    expected: [0.5, 0, 0.5, 1],
    tolerance: 0.03,
    mipLevel: 1,
    generateMipmaps: true,
  },
  {
    name: 'bc1-rgba-unorm',
    kind: 'float',
    format: 'bc1-rgba-unorm',
    size: 4,
    data: solidGreenBc1,
    expected: [0, 1, 0, 1],
  },
];

/** Every check's name, in the order their cells are drawn. */
export const checkNames: readonly string[] = [
  ...textureChecks.map((check) => check.name),
  'depth-two-units',
  'integer-attribute',
];

/** What `measure` returns. */
export interface FormatMeasurement {
  /** The color of each check's cell, `null` for one the GPU can't run. */
  readonly checks: Readonly<Record<string, Rgba | null>>;

  /** The cell of a check that passes. */
  readonly passControl: Rgba;

  /** The cell of a check that fails. */
  readonly failControl: Rgba;
}

/** The handle `gpu-device-formats.spec.ts` drives. */
export interface FormatSceneHandle extends SceneHandle {
  /** Reads every cell. Call in the same task as `step()`. */
  measure(): FormatMeasurement;
}

interface PreparedCheck {
  readonly name: string;
  readonly pipeline: GpuRenderPipeline;
  readonly bindGroup: GpuBindGroup;
  readonly vertexBuffer?: ReturnType<GpuDevice['createBuffer']>;
}

const isAvailable = (device: GpuDevice, format: GpuTextureFormat): boolean =>
  !format.startsWith('bc1') || device.capabilities.textureCompression.bc;

/**
 * Builds a scene that creates a texture of every format the device has,
 * uploads a known texel into each, and draws one cell per texture whose
 * shader compares what it samples with what was uploaded: green when they
 * match, red when not. Everything is drawn through the GPU device only.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): FormatSceneHandle => {
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });
  const { device } = renderContext;
  const empty = device.createBindGroupLayout({ entries: [] });
  const emptyGroup = device.createBindGroup({ layout: empty, entries: [] });
  const sampleTypes = {
    float: 'unfilterable-float',
    uint: 'uint',
    depth: 'depth',
  } as const;
  const layouts: Record<CheckKind, GpuBindGroupLayout> = {
    float: materialLayout(device, sampleTypes.float),
    uint: materialLayout(device, sampleTypes.uint),
    depth: materialLayout(device, sampleTypes.depth),
  };
  const pipelines: Record<CheckKind, GpuRenderPipeline> = {
    float: checkPipeline(device, floatCheckShader, layouts.float, empty),
    uint: checkPipeline(device, uintCheckShader, layouts.uint, empty),
    depth: checkPipeline(device, floatCheckShader, layouts.depth, empty),
  };
  const uniforms = device.createStagingBuffer({ usage: 'uniform' });
  const sampler = device.createSampler();

  const prepareTextureCheck = (
    check: TextureCheck,
    expected: readonly number[] = check.expected,
  ): PreparedCheck | null => {
    if (!isAvailable(device, check.format)) {
      return null;
    }

    const size = check.size ?? 1;
    const texture: GpuTexture = device.createTexture({
      format: check.format,
      size: { width: size, height: size },
      mipLevelCount: check.generateMipmaps ? 'full' : 1,
      usage: ['sampled', 'copy-destination'],
      label: check.name,
    });

    texture.write(check.data);

    if (check.generateMipmaps) {
      texture.generateMipmaps();
    }

    const offset = uniforms.allocate(48);
    const mask = check.mask ?? [1, 1, 1, 1];

    if (check.kind === 'uint') {
      uniforms.uint32.set([...expected, ...mask], offset / 4);
    } else {
      uniforms.float32.set(
        [
          ...expected,
          ...mask,
          check.tolerance ?? 0.01,
          check.mipLevel ?? 0,
          0,
          0,
        ],
        offset / 4,
      );
    }

    return {
      name: check.name,
      pipeline: pipelines[check.kind],
      bindGroup: device.createBindGroup({
        layout: layouts[check.kind],
        entries: [
          { binding: 0, texture, sampler },
          { binding: 1, buffer: uniforms.buffer, offset, size: 48 },
        ],
      }),
    };
  };

  const checks: (PreparedCheck | null)[] = textureChecks.map((check) =>
    prepareTextureCheck(check),
  );

  checks.push(prepareTwoUnitDepthCheck(device, empty));
  checks.push(prepareIntegerAttributeCheck(device, empty));

  const [rgba8Check] = textureChecks.filter(
    (check) => check.name === 'rgba8unorm',
  );
  const controls = [
    prepareTextureCheck(rgba8Check),
    prepareTextureCheck(rgba8Check, [1, 1, 1, 1]),
  ];
  const cells = [...checks, ...controls];

  return {
    step(): void {
      const encoder = device.createCommandEncoder({ label: 'formats' });
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: device.canvasTexture,
            loadOp: 'clear',
            clearValue: [0, 0, 0, 1],
            storeOp: 'store',
          },
        ],
      });

      cells.forEach((check, index) => {
        if (!check) {
          return;
        }

        const { x, y } = cellOrigin(index, renderContext.height);

        pass.setViewport(x, y, cellSize, cellSize, 0, 1);
        pass.setPipeline(check.pipeline);
        pass.setBindGroup(0, emptyGroup);
        pass.setBindGroup(1, emptyGroup);
        pass.setBindGroup(2, check.bindGroup);

        if (check.vertexBuffer) {
          pass.setVertexBuffer(0, check.vertexBuffer);
        }

        pass.draw(3);
      });

      pass.end();
      device.submit([encoder.finish()]);
    },

    measure(): FormatMeasurement {
      const pixels = readCanvas(renderContext);

      const colorOf = (index: number): Rgba => {
        const { x, y } = cellOrigin(index, renderContext.height);
        const centerFromTop = renderContext.height - (y + cellSize / 2);

        return pixels.at(x + cellSize / 2, centerFromTop);
      };

      const results: Record<string, Rgba | null> = {};

      checks.forEach((check, index) => {
        results[checkNames[index]] = check ? colorOf(index) : null;
      });

      return {
        checks: results,
        passControl: colorOf(checks.length),
        failControl: colorOf(checks.length + 1),
      };
    },
  };
};

/** The bottom-left corner of a cell, in pixels from the bottom-left. */
function cellOrigin(
  index: number,
  canvasHeight: number,
): { x: number; y: number } {
  const column = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: column * (cellSize + 4),
    y: canvasHeight - (row + 1) * (cellSize + 4),
  };
}

function materialLayout(
  device: GpuDevice,
  sampleType: 'unfilterable-float' | 'uint' | 'depth',
): GpuBindGroupLayout {
  return device.createBindGroupLayout({
    label: sampleType,
    entries: [
      {
        binding: 0,
        visibility: ['fragment'],
        texture: { name: 'u_texture', sampleType },
      },
      {
        binding: 1,
        visibility: ['fragment'],
        buffer: { name: 'ForgeMaterial' },
      },
    ],
  });
}

function checkPipeline(
  device: GpuDevice,
  fragment: string,
  layout: GpuBindGroupLayout,
  empty: GpuBindGroupLayout,
): GpuRenderPipeline {
  return device.createRenderPipeline({
    shaders: { vertex: fullscreenTriangleVertexShader, fragment },
    targets: [{ format: 'rgba8unorm' }],
    bindGroupLayouts: [empty, empty, layout],
  });
}

/**
 * One depth texture bound on two units: through a comparison sampler and
 * through a `nearest` sampler without comparison.
 */
function prepareTwoUnitDepthCheck(
  device: GpuDevice,
  empty: GpuBindGroupLayout,
): PreparedCheck {
  const layout = device.createBindGroupLayout({
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
      {
        binding: 1,
        visibility: ['fragment'],
        texture: { name: 'u_depth', sampleType: 'depth' },
      },
    ],
  });
  const texture = device.createTexture({
    format: 'depth32float',
    size: { width: 1, height: 1 },
    usage: ['sampled', 'copy-destination'],
  });

  texture.write(new Float32Array([0.5]));

  return {
    name: 'depth-two-units',
    pipeline: device.createRenderPipeline({
      shaders: {
        vertex: fullscreenTriangleVertexShader,
        fragment: twoUnitDepthShader,
      },
      targets: [{ format: 'rgba8unorm' }],
      bindGroupLayouts: [empty, empty, layout],
    }),
    bindGroup: device.createBindGroup({
      layout,
      entries: [
        {
          binding: 0,
          texture,
          sampler: device.createSampler({ compare: 'less' }),
        },
        { binding: 1, texture, sampler: device.createSampler() },
      ],
    }),
  };
}

/** An integer vertex attribute, read as integers. */
function prepareIntegerAttributeCheck(
  device: GpuDevice,
  empty: GpuBindGroupLayout,
): PreparedCheck {
  const joints = [1, 2, 3, 250];

  return {
    name: 'integer-attribute',
    pipeline: device.createRenderPipeline({
      shaders: {
        vertex: integerAttributeVertexShader,
        fragment: integerAttributeFragmentShader,
      },
      vertexBuffers: [
        {
          stride: 4,
          attributes: [{ semantic: 'joints0', format: 'uint8x4', offset: 0 }],
        },
      ],
      targets: [{ format: 'rgba8unorm' }],
      bindGroupLayouts: [empty, empty, empty],
    }),
    bindGroup: device.createBindGroup({ layout: empty, entries: [] }),
    vertexBuffer: device.createBuffer({
      usage: 'vertex',
      size: 12,
      data: new Uint8Array([...joints, ...joints, ...joints]),
    }),
  };
}
