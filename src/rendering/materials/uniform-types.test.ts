import { describe, expect, it, vi } from 'vitest';
import { getUniformType } from './uniform-types.js';

const location = {} as WebGLUniformLocation;

const createGl = (): WebGL2RenderingContext =>
  ({
    uniform1fv: vi.fn(),
    uniform2fv: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    uniformMatrix2fv: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    uniformMatrix2x3fv: vi.fn(),
    uniformMatrix2x4fv: vi.fn(),
    uniformMatrix3x2fv: vi.fn(),
    uniformMatrix3x4fv: vi.fn(),
    uniformMatrix4x2fv: vi.fn(),
    uniformMatrix4x3fv: vi.fn(),
    uniform1iv: vi.fn(),
    uniform2iv: vi.fn(),
    uniform3iv: vi.fn(),
    uniform4iv: vi.fn(),
    uniform1uiv: vi.fn(),
    uniform2uiv: vi.fn(),
    uniform3uiv: vi.fn(),
    uniform4uiv: vi.fn(),
  }) as unknown as WebGL2RenderingContext;

describe('getUniformType', () => {
  it.each([
    [0x1406, 'float', 1, 'uniform1fv'],
    [0x8b50, 'vec2', 2, 'uniform2fv'],
    [0x8b51, 'vec3', 3, 'uniform3fv'],
    [0x8b52, 'vec4', 4, 'uniform4fv'],
  ] as const)(
    'maps GL type %d to %s, uploaded with %s',
    (glType, glslName, componentCount, call) => {
      const uniformType = getUniformType(glType);
      const gl = createGl();
      const data = new Float32Array(componentCount);

      expect(uniformType).toMatchObject({
        kind: 'float',
        glslName,
        componentCount,
      });

      if (uniformType?.kind !== 'float') {
        throw new Error('Expected a float uniform type');
      }

      uniformType.upload(gl, location, data);

      expect(gl[call]).toHaveBeenCalledWith(location, data);
    },
  );

  it.each([
    [0x8b5a, 'mat2', 4, 'uniformMatrix2fv'],
    [0x8b5b, 'mat3', 9, 'uniformMatrix3fv'],
    [0x8b5c, 'mat4', 16, 'uniformMatrix4fv'],
    [0x8b65, 'mat2x3', 6, 'uniformMatrix2x3fv'],
    [0x8b66, 'mat2x4', 8, 'uniformMatrix2x4fv'],
    [0x8b67, 'mat3x2', 6, 'uniformMatrix3x2fv'],
    [0x8b68, 'mat3x4', 12, 'uniformMatrix3x4fv'],
    [0x8b69, 'mat4x2', 8, 'uniformMatrix4x2fv'],
    [0x8b6a, 'mat4x3', 12, 'uniformMatrix4x3fv'],
  ] as const)(
    'maps GL type %d to %s, uploaded without transposing with %s',
    (glType, glslName, componentCount, call) => {
      const uniformType = getUniformType(glType);
      const gl = createGl();
      const data = new Float32Array(componentCount);

      expect(uniformType).toMatchObject({
        kind: 'float',
        glslName,
        componentCount,
      });

      if (uniformType?.kind !== 'float') {
        throw new Error('Expected a float uniform type');
      }

      uniformType.upload(gl, location, data);

      expect(gl[call]).toHaveBeenCalledWith(location, false, data);
    },
  );

  it.each([
    [0x1404, 'int', 'int', 1, 'uniform1iv'],
    [0x8b53, 'int', 'ivec2', 2, 'uniform2iv'],
    [0x8b54, 'int', 'ivec3', 3, 'uniform3iv'],
    [0x8b55, 'int', 'ivec4', 4, 'uniform4iv'],
    [0x8b56, 'bool', 'bool', 1, 'uniform1iv'],
    [0x8b57, 'bool', 'bvec2', 2, 'uniform2iv'],
    [0x8b58, 'bool', 'bvec3', 3, 'uniform3iv'],
    [0x8b59, 'bool', 'bvec4', 4, 'uniform4iv'],
  ] as const)(
    'maps GL type %d to a %s %s, uploaded with %s',
    (glType, kind, glslName, componentCount, call) => {
      const uniformType = getUniformType(glType);
      const gl = createGl();
      const data = new Int32Array(componentCount);

      expect(uniformType).toMatchObject({ kind, glslName, componentCount });

      if (uniformType?.kind !== 'int' && uniformType?.kind !== 'bool') {
        throw new Error('Expected an int or bool uniform type');
      }

      uniformType.upload(gl, location, data);

      expect(gl[call]).toHaveBeenCalledWith(location, data);
    },
  );

  it.each([
    [0x1405, 'uint', 1, 'uniform1uiv'],
    [0x8dc6, 'uvec2', 2, 'uniform2uiv'],
    [0x8dc7, 'uvec3', 3, 'uniform3uiv'],
    [0x8dc8, 'uvec4', 4, 'uniform4uiv'],
  ] as const)(
    'maps GL type %d to %s, uploaded with %s',
    (glType, glslName, componentCount, call) => {
      const uniformType = getUniformType(glType);
      const gl = createGl();
      const data = new Uint32Array(componentCount);

      expect(uniformType).toMatchObject({
        kind: 'uint',
        glslName,
        componentCount,
      });

      if (uniformType?.kind !== 'uint') {
        throw new Error('Expected a uint uniform type');
      }

      uniformType.upload(gl, location, data);

      expect(gl[call]).toHaveBeenCalledWith(location, data);
    },
  );

  it.each([
    [0x8b5e, 'sampler2D'],
    [0x8b5f, 'sampler3D'],
    [0x8b60, 'samplerCube'],
    [0x8b62, 'sampler2DShadow'],
    [0x8dc1, 'sampler2DArray'],
    [0x8dc4, 'sampler2DArrayShadow'],
    [0x8dc5, 'samplerCubeShadow'],
    [0x8dca, 'isampler2D'],
    [0x8dcb, 'isampler3D'],
    [0x8dcc, 'isamplerCube'],
    [0x8dcf, 'isampler2DArray'],
    [0x8dd2, 'usampler2D'],
    [0x8dd3, 'usampler3D'],
    [0x8dd4, 'usamplerCube'],
    [0x8dd7, 'usampler2DArray'],
  ] as const)('maps GL type %d to the sampler type %s', (glType, glslName) => {
    expect(getUniformType(glType)).toEqual({ kind: 'sampler', glslName });
  });

  it('returns null for a GL type that is not a WebGL 2 uniform type', () => {
    expect(getUniformType(0)).toBeNull();
  });
});
