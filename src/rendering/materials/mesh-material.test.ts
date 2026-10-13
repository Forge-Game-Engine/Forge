/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import { Matrix3x3 } from '../../math/index.js';
import { RenderContext } from '../render-context.js';
import {
  ForgeShaderSource,
  maskShaderInclude,
  meshVertexShaderInclude,
  ResolveIncludesPreProcessor,
  ShaderCache,
} from '../shaders/index.js';
import type { InstanceMask } from '../utilities/resolve-instance-mask.js';
import { createMeshMaterial } from './mesh-material.js';

const flatVertexShader = `#version 300 es
#pragma forge name(flat.vert)
#pragma forge include(meshVertex)
in vec2 a_position;
void main() {
  vec2 world = meshWorldPosition(a_position);
  gl_Position = meshClipPosition(world);
  forwardMeshMask(world);
}`;

const flatFragmentShader = `#version 300 es
#pragma forge name(flat.frag)
precision mediump float;
uniform vec4 u_tint;
out vec4 fragColor;
#pragma forge include(mask)
void main() { fragColor = vec4(u_tint.rgb, u_tint.a * maskCoverage()); }`;

const unplacedVertexShader = `#version 300 es
#pragma forge name(unplaced.vert)
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

const unmaskedFragmentShader = `#version 300 es
#pragma forge name(unmasked.frag)
precision mediump float;
out vec4 fragColor;
void main() { fragColor = vec4(1.0); }`;

const glFloatVec2 = 0x8b50;
const glFloatVec4 = 0x8b52;
const glFloatMat3 = 0x8b5b;

describe('MeshMaterial', () => {
  let gl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let activeUniforms: { name: string; type: number }[];

  /** The last value uploaded to the named uniform. */
  const uploaded = (name: string): number[] => {
    const calls = [
      ...(gl.uniform2fv as Mock).mock.calls,
      ...(gl.uniform4fv as Mock).mock.calls,
      ...(gl.uniformMatrix3fv as Mock).mock.calls.map(
        ([location, , data]: unknown[]) => [location, data],
      ),
    ].filter(([location]) => (location as { name: string }).name === name);

    return Array.from(calls[calls.length - 1][1] as Float32Array);
  };

  beforeEach(() => {
    activeUniforms = [];
    gl = {
      ACTIVE_UNIFORMS: 'ACTIVE_UNIFORMS',
      createBuffer: vi.fn(() => ({})),
      createShader: vi.fn(() => ({})),
      deleteShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(
        (_program: unknown, parameter: unknown): unknown =>
          parameter === 'ACTIVE_UNIFORMS' ? activeUniforms.length : true,
      ),
      getActiveUniform: vi.fn(
        (_program: unknown, index: number) =>
          activeUniforms[index] && { size: 1, ...activeUniforms[index] },
      ),
      getUniformLocation: vi.fn((_program: unknown, name: string) => ({
        name,
      })),
      useProgram: vi.fn(),
      uniform2fv: vi.fn(),
      uniform4fv: vi.fn(),
      uniformMatrix3fv: vi.fn(),
      createTexture: vi.fn(() => ({})),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      getExtension: vi.fn(() => null),
      isContextLost: vi.fn(() => false),
    } as unknown as WebGL2RenderingContext;

    const canvas = document.createElement('canvas');

    vi.spyOn(canvas, 'getContext').mockReturnValue(gl);

    const shaderCache = new ShaderCache([
      new ResolveIncludesPreProcessor([
        new ForgeShaderSource(maskShaderInclude),
        new ForgeShaderSource(meshVertexShaderInclude),
      ]),
    ])
      .addShader(new ForgeShaderSource(flatVertexShader))
      .addShader(new ForgeShaderSource(flatFragmentShader))
      .addShader(new ForgeShaderSource(unplacedVertexShader))
      .addShader(new ForgeShaderSource(unmaskedFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
  });

  it("throws for a vertex shader that doesn't include meshVertex", () => {
    expect(() =>
      createMeshMaterial(renderContext, 'unplaced.vert', 'flat.frag'),
    ).toThrow('must include "meshVertex"');
  });

  it("throws for a fragment shader that doesn't include mask", () => {
    expect(() =>
      createMeshMaterial(renderContext, 'flat.vert', 'unmasked.frag'),
    ).toThrow('must include "mask"');
  });

  it('shares one program between materials made from the same shaders', () => {
    const first = createMeshMaterial(renderContext, 'flat.vert', 'flat.frag');
    const second = createMeshMaterial(renderContext, 'flat.vert', 'flat.frag');

    expect(first.program).toBe(second.program);
    expect(gl.linkProgram).toHaveBeenCalledTimes(1);
  });

  it.each([
    'u_model',
    'u_viewProjection',
    'u_maskClip',
    'u_maskAxes',
    'u_maskOrigin',
    'u_maskShape',
  ])(
    'does not let %s be set, since the render system sets it per mesh',
    (name) => {
      const material = createMeshMaterial(
        renderContext,
        'flat.vert',
        'flat.frag',
      );

      expect(() => material.setUniform(name, Matrix3x3.identity)).toThrow(
        'set by the render system',
      );
    },
  );

  it('lets its own uniforms be set', () => {
    const material = createMeshMaterial(
      renderContext,
      'flat.vert',
      'flat.frag',
    );

    expect(() =>
      material.setUniform('u_tint', new Float32Array([1, 0, 0, 1])),
    ).not.toThrow();
  });

  describe('bindMesh', () => {
    beforeEach(() => {
      activeUniforms = [
        { name: 'u_model', type: glFloatMat3 },
        { name: 'u_viewProjection', type: glFloatMat3 },
        { name: 'u_maskClip', type: glFloatVec4 },
        { name: 'u_maskAxes', type: glFloatVec4 },
        { name: 'u_maskOrigin', type: glFloatVec2 },
        { name: 'u_maskShape', type: glFloatVec4 },
      ];
    });

    it('uploads the model and view-projection matrices', () => {
      const material = createMeshMaterial(
        renderContext,
        'flat.vert',
        'flat.frag',
      );
      const model = Matrix3x3.identity.translate(3, 4);
      const viewProjection = Matrix3x3.identity.scale(0.5, 0.25);

      material.bindMesh(gl, model, viewProjection, null);

      expect(uploaded('u_model')).toEqual(Array.from(model.matrix));
      expect(uploaded('u_viewProjection')).toEqual(
        Array.from(viewProjection.matrix),
      );
    });

    it('uploads an unbounded clip rect and no shape for no masks', () => {
      const material = createMeshMaterial(
        renderContext,
        'flat.vert',
        'flat.frag',
      );

      material.bindMesh(gl, Matrix3x3.identity, Matrix3x3.identity, null);

      const [minX, minY, maxX, maxY] = uploaded('u_maskClip');

      expect(minX).toBeLessThan(-1e29);
      expect(minY).toBeLessThan(-1e29);
      expect(maxX).toBeGreaterThan(1e29);
      expect(maxY).toBeGreaterThan(1e29);
      expect(uploaded('u_maskShape')[0]).toBe(0);
    });

    it('uploads masks in the Y-up world, unlike the Y-down sprite instance data', () => {
      const material = createMeshMaterial(
        renderContext,
        'flat.vert',
        'flat.frag',
      );
      const mask: InstanceMask = {
        visible: true,
        clip: { min: { x: -1, y: -2 }, max: { x: 3, y: 4 } },
        bounds: { min: { x: -1, y: -2 }, max: { x: 3, y: 4 } },
        shape: {
          kind: 'linear',
          origin: { x: 5, y: 6 },
          axes: { xx: 1, xy: 2, yx: 3, yy: 4 },
          edge: 0.5,
        },
      };

      material.bindMesh(gl, Matrix3x3.identity, Matrix3x3.identity, mask);

      expect(uploaded('u_maskClip')).toEqual([-1, -2, 3, 4]);
      expect(uploaded('u_maskAxes')).toEqual([1, 2, 3, 4]);
      expect(uploaded('u_maskOrigin')).toEqual([5, 6]);
      // Linear (1), clipped (+3), then how far the revealed part reaches.
      expect(uploaded('u_maskShape')).toEqual([4, 0.5, 0, 0]);
    });

    it("uploads each mesh's own values when one material draws several", () => {
      const material = createMeshMaterial(
        renderContext,
        'flat.vert',
        'flat.frag',
      );

      material.bindMesh(
        gl,
        Matrix3x3.identity.translate(1, 0),
        Matrix3x3.identity,
        null,
      );
      material.bindMesh(
        gl,
        Matrix3x3.identity.translate(2, 0),
        Matrix3x3.identity,
        null,
      );

      expect(uploaded('u_model')[6]).toBe(2);
    });
  });
});
