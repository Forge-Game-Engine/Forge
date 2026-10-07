/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { Material } from './material';
import { Matrix3x3 } from '../../math/index.js';
import { Color } from '../color.js';
import { ForgeShaderSource } from '../index.js';

// Mock WebGLTexture constructor for instanceof checks

globalThis.WebGLTexture = class WebGLTexture {};

// GL type enums reported by `getActiveUniform`, as defined by WebGL 2.
const glTypes = {
  float: 0x1406,
  vec2: 0x8b50,
  vec3: 0x8b51,
  vec4: 0x8b52,
  int: 0x1404,
  ivec2: 0x8b53,
  uint: 0x1405,
  uvec3: 0x8dc7,
  bool: 0x8b56,
  bvec2: 0x8b57,
  mat3: 0x8b5b,
  mat4: 0x8b5c,
  sampler2D: 0x8b5e,
  samplerCube: 0x8b60,
} as const;

interface MockActiveUniform {
  name: string;
  type: number;
  size?: number;
}

let shaderNameCounter = 0;

const createShaderSource = (source: string): ForgeShaderSource =>
  new ForgeShaderSource(
    `#pragma forge name(testShader${shaderNameCounter++})\n${source}`,
  );

describe('Material', () => {
  let gl: WebGL2RenderingContext;
  let mockProgram: WebGLProgram;
  let mockVertexShader: WebGLShader;

  beforeEach(() => {
    // Create mock shaders and program
    mockProgram = {};
    mockVertexShader = {};

    // Create a mock WebGL2RenderingContext with all necessary methods
    gl = {
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
      COMPILE_STATUS: 35713,
      LINK_STATUS: 35714,
      ACTIVE_UNIFORMS: 35718,
      TEXTURE0: 33984,
      TEXTURE_2D: 3553,
      TEXTURE_CUBE_MAP: 34067,
      createShader: vi.fn(() => mockVertexShader),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      getShaderInfoLog: vi.fn(() => ''),
      deleteShader: vi.fn(),
      createProgram: vi.fn(() => mockProgram),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      getProgramInfoLog: vi.fn(() => ''),
      deleteProgram: vi.fn(),
      getActiveUniform: vi.fn(),
      getUniformLocation: vi.fn(),
      useProgram: vi.fn(),
      uniform1f: vi.fn(),
      uniform1i: vi.fn(),
      uniform1iv: vi.fn(),
      uniform1ui: vi.fn(),
      uniform1fv: vi.fn(),
      uniform2iv: vi.fn(),
      uniform3uiv: vi.fn(),
      uniform2fv: vi.fn(),
      uniform3fv: vi.fn(),
      uniform4fv: vi.fn(),
      uniformMatrix3fv: vi.fn(),
      uniformMatrix4fv: vi.fn(),
      activeTexture: vi.fn(),
      bindTexture: vi.fn(),
    } as unknown as WebGL2RenderingContext;
  });

  describe('constructor', () => {
    it('should create a material with valid shaders', () => {
      // Setup: program creation should succeed
      (gl.getProgramParameter as Mock).mockReturnValue(true);
      (gl.getActiveUniform as Mock).mockReturnValue(null);

      const vertexShader = createShaderSource(
        'void main() { gl_Position = vec4(0.0); }',
      );
      const fragmentShader = createShaderSource(
        'void main() { gl_FragColor = vec4(1.0); }',
      );

      const material = new Material(vertexShader, fragmentShader, gl);

      expect(material.program).toBe(mockProgram);
      expect(gl.createProgram).toHaveBeenCalled();
      expect(gl.linkProgram).toHaveBeenCalledWith(mockProgram);
    });

    it('should throw an error if shader compilation fails', () => {
      // Setup: shader compilation should fail
      (gl.getShaderParameter as Mock).mockReturnValue(false);
      (gl.getShaderInfoLog as Mock).mockReturnValue('Shader compile error');

      const vertexShader = createShaderSource('invalid shader');
      const fragmentShader = createShaderSource(
        'void main() { gl_FragColor = vec4(1.0); }',
      );

      expect(() => new Material(vertexShader, fragmentShader, gl)).toThrow(
        'Shader compile error: Shader compile error',
      );
    });

    it('should throw an error if program linking fails', () => {
      // Setup: program linking should fail
      (gl.getShaderParameter as Mock).mockReturnValue(true);
      (gl.getProgramParameter as Mock).mockReturnValue(false);
      (gl.getProgramInfoLog as Mock).mockReturnValue('Link error');

      const vertexShader = createShaderSource(
        'void main() { gl_Position = vec4(0.0); }',
      );
      const fragmentShader = createShaderSource(
        'void main() { gl_FragColor = vec4(1.0); }',
      );

      expect(() => new Material(vertexShader, fragmentShader, gl)).toThrow(
        'Failed to link program: Link error',
      );
    });

    it('should detect uniforms in the shader program', () => {
      const mockLocation = {} as WebGLUniformLocation;
      (gl.getProgramParameter as Mock).mockReturnValue(2); // 2 uniforms
      (gl.getActiveUniform as Mock)
        .mockReturnValueOnce({ name: 'uColor', type: 5126, size: 1 })
        .mockReturnValueOnce({ name: 'uTexture', type: 5126, size: 1 });
      (gl.getUniformLocation as Mock).mockReturnValue(mockLocation);

      const vertexShader = createShaderSource(
        'uniform vec4 uColor; void main() {}',
      );
      const fragmentShader = createShaderSource(
        'uniform sampler2D uTexture; void main() {}',
      );

      // Create material to test uniform detection
      const material = new Material(vertexShader, fragmentShader, gl);

      expect(material).toBeDefined();
      expect(gl.getActiveUniform).toHaveBeenCalledTimes(2);
      expect(gl.getUniformLocation).toHaveBeenCalledWith(mockProgram, 'uColor');
      expect(gl.getUniformLocation).toHaveBeenCalledWith(
        mockProgram,
        'uTexture',
      );
    });
  });

  describe('uniforms', () => {
    let locations: Map<string, WebGLUniformLocation>;

    /**
     * Declares each mocked active uniform in GLSL, so the material sees the
     * same uniforms in its source as the program reports. Struct members
     * and unknown types are left out, as a real source can't declare them
     * by those names.
     */
    const declare = (uniforms: MockActiveUniform[]): string =>
      uniforms
        .map(({ name, type, size = 1 }) => {
          const glslName = Object.entries(glTypes).find(
            ([, glType]) => glType === type,
          )?.[0];
          const isArray = name.endsWith('[0]') || size > 1;
          const baseName = name.replace(/\[0\]$/, '');

          if (glslName === undefined || baseName.includes('.')) {
            return '';
          }

          return isArray
            ? `uniform ${glslName} ${baseName}[${size}];`
            : `uniform ${glslName} ${baseName};`;
        })
        .join('\n');

    const createMaterial = (
      uniforms: MockActiveUniform[],
      fragmentDeclarations: string = declare(uniforms),
      vertexDeclarations: string = '',
    ): Material => {
      (gl.getProgramParameter as Mock).mockImplementation(
        (_program: WebGLProgram, parameter: GLenum) =>
          parameter === gl.ACTIVE_UNIFORMS ? uniforms.length : true,
      );
      (gl.getActiveUniform as Mock).mockImplementation(
        (_program: WebGLProgram, index: number) => {
          const uniform = uniforms[index];

          return uniform ? { size: 1, ...uniform } : null;
        },
      );
      (gl.getUniformLocation as Mock).mockImplementation(
        (_program: WebGLProgram, name: string) => locationOf(name),
      );

      return new Material(
        createShaderSource(`${vertexDeclarations}\nvoid main() {}`),
        createShaderSource(`${fragmentDeclarations}\nvoid main() {}`),
        gl,
      );
    };

    const locationOf = (name: string): WebGLUniformLocation => {
      const existing = locations.get(name);

      if (existing) {
        return existing;
      }

      const location = { name } as WebGLUniformLocation;
      locations.set(name, location);

      return location;
    };

    beforeEach(() => {
      locations = new Map();
    });

    describe('setUniform', () => {
      it('should throw an error when setting a non-existent uniform', () => {
        const material = createMaterial([
          { name: 'uTestUniform', type: glTypes.float },
        ]);

        expect(() => material.setUniform('uNonExistent', 42)).toThrow(
          /^Uniform "uNonExistent" is not declared in material "testShader\d+" \+ "testShader\d+"\. Declared uniforms: uTestUniform\.$/,
        );
      });

      it('should register a uniform array under its declared name and the name WebGL reports', () => {
        const material = createMaterial([
          { name: 'u_waves[0]', type: glTypes.vec4, size: 4 },
        ]);

        expect(() =>
          material.setUniform('u_waves', new Float32Array(16)),
        ).not.toThrow();
        expect(() =>
          material.setUniform('u_waves[0]', new Float32Array(16)),
        ).not.toThrow();
        expect(() => material.setUniform('uMissing', 1)).toThrow(
          'Declared uniforms: u_waves.',
        );
      });

      it('should throw when a Float32Array does not match a non-array uniform', () => {
        const material = createMaterial([
          { name: 'u_color', type: glTypes.vec4 },
        ]);

        expect(() =>
          material.setUniform('u_color', new Float32Array(8)),
        ).toThrow(
          'Uniform "u_color" is declared as vec4 and expects a Float32Array of length 4, but received a Float32Array of length 8.',
        );
        expect(() =>
          material.setUniform('u_color', new Float32Array(3)),
        ).toThrow();
      });

      it('should throw when a Float32Array is not a whole number of array elements or exceeds the array', () => {
        const material = createMaterial([
          { name: 'u_waves[0]', type: glTypes.vec4, size: 4 },
        ]);

        expect(() =>
          material.setUniform('u_waves', new Float32Array(6)),
        ).toThrow(
          'Uniform "u_waves" is declared as vec4[4] and expects a Float32Array whose length is a multiple of 4, up to 16, but received a Float32Array of length 6.',
        );
        expect(() =>
          material.setUniform('u_waves', new Float32Array(20)),
        ).toThrow();
        expect(() =>
          material.setUniform('u_waves', new Float32Array(0)),
        ).toThrow();
      });

      it('should throw when the value kind does not match the declared type', () => {
        const material = createMaterial([
          { name: 'u_float', type: glTypes.float },
          { name: 'u_vec2', type: glTypes.vec2 },
          { name: 'u_int', type: glTypes.int },
          { name: 'u_bool', type: glTypes.bool },
          { name: 'u_texture', type: glTypes.sampler2D },
          { name: 'u_floats[0]', type: glTypes.float, size: 4 },
        ]);

        expect(() => material.setUniform('u_vec2', 1)).toThrow(
          'Uniform "u_vec2" is declared as vec2 and expects a Vector2 or a Float32Array of length 2, but received a number.',
        );
        expect(() => material.setUniform('u_float', true)).toThrow(
          'but received a boolean.',
        );
        expect(() => material.setUniform('u_bool', 1)).toThrow(
          'Uniform "u_bool" is declared as bool and expects a boolean or an Int32Array of length 1, but received a number.',
        );
        expect(() => material.setUniform('u_int', new Float32Array(1))).toThrow(
          'Uniform "u_int" is declared as int and expects a number or a boolean or an Int32Array of length 1, but received a Float32Array of length 1.',
        );
        expect(() => material.setUniform('u_float', new Int32Array(1))).toThrow(
          'but received an Int32Array of length 1.',
        );
        expect(() =>
          material.setUniform('u_float', new WebGLTexture()),
        ).toThrow('but received a WebGLTexture.');
        expect(() =>
          material.setUniform('u_texture', new Float32Array(1)),
        ).toThrow(
          'Uniform "u_texture" is declared as sampler2D and expects a WebGLTexture, but received a Float32Array of length 1.',
        );
        expect(() => material.setUniform('u_floats', 1)).toThrow(
          'Uniform "u_floats" is declared as float[4] and expects a Float32Array of length 1 to 4, but received a number.',
        );
      });

      it('should describe a mismatched Vector2, Matrix3x3 or Uint32Array value', () => {
        const material = createMaterial([
          { name: 'u_projection', type: glTypes.mat3 },
          { name: 'u_ints', type: glTypes.ivec2 },
        ]);

        expect(() =>
          material.setUniform('u_projection', { x: 1, y: 2 }),
        ).toThrow(
          'Uniform "u_projection" is declared as mat3 and expects a Matrix3x3 or a Float32Array of length 9, but received a Vector2.',
        );
        expect(() =>
          material.setUniform(
            'u_ints',
            new Matrix3x3([1, 0, 0, 0, 1, 0, 0, 0, 1]),
          ),
        ).toThrow('but received a Matrix3x3.');
        expect(() => material.setUniform('u_ints', new Uint32Array(2))).toThrow(
          'but received a Uint32Array of length 2.',
        );
      });

      it('should throw for a sampler array', () => {
        const material = createMaterial([
          { name: 'u_textures[0]', type: glTypes.sampler2D, size: 2 },
        ]);

        expect(() =>
          material.setUniform('u_textures', new WebGLTexture()),
        ).toThrow('Material does not support sampler arrays');
      });

      it('should throw for a uniform whose GL type is not a WebGL 2 uniform type', () => {
        const material = createMaterial([{ name: 'u_unknown', type: 0x1234 }]);

        expect(() => material.setUniform('u_unknown', 1)).toThrow(
          'Uniform "u_unknown" has GL type 0x1234, which is not a WebGL 2 uniform type Material can upload.',
        );
      });

      it('should keep the previous value when a new value is rejected', () => {
        const material = createMaterial([
          { name: 'u_color', type: glTypes.vec4 },
        ]);
        const color = new Float32Array([1, 2, 3, 4]);

        material.setUniform('u_color', color);

        expect(() =>
          material.setUniform('u_color', new Float32Array(3)),
        ).toThrow();

        material.bind(gl);

        expect(gl.uniform4fv).toHaveBeenCalledWith(
          locationOf('u_color'),
          color,
        );
      });
      it('should skip an active uniform that has no location', () => {
        (gl.getProgramParameter as Mock).mockImplementation(
          (_program: WebGLProgram, parameter: GLenum) =>
            parameter === gl.ACTIVE_UNIFORMS ? 2 : true,
        );
        (gl.getActiveUniform as Mock).mockImplementation(
          (_program: WebGLProgram, index: number) =>
            [
              { name: 'gl_DepthRange.near', type: glTypes.float, size: 1 },
              { name: 'u_value', type: glTypes.float, size: 1 },
            ][index] ?? null,
        );
        (gl.getUniformLocation as Mock).mockImplementation(
          (_program: WebGLProgram, name: string) =>
            name === 'u_value' ? locationOf(name) : null,
        );

        const material = new Material(
          createShaderSource('void main() {}'),
          createShaderSource('uniform float u_value;\nvoid main() {}'),
          gl,
        );

        expect(() => material.setUniform('gl_DepthRange.near', 1)).toThrow(
          'Declared uniforms: u_value.',
        );
      });
    });

    describe('declared uniforms the compiler stripped', () => {
      it('should accept a declared uniform the program does not report', () => {
        const material = createMaterial(
          [{ name: 'u_color', type: glTypes.vec4 }],
          'uniform vec4 u_color;\nuniform float u_time;',
        );

        expect(() => material.setUniform('u_time', 1)).not.toThrow();
      });

      it('should validate a stripped uniform against its declared type', () => {
        const material = createMaterial([], 'uniform float u_time;');

        expect(() => material.setUniform('u_time', new WebGLTexture())).toThrow(
          'Uniform "u_time" is declared as float and expects a number or a Float32Array of length 1, but received a WebGLTexture.',
        );
        expect(() =>
          material.setUniform('u_time', new Float32Array(2)),
        ).toThrow('is declared as float');
      });

      it('should never upload a stripped uniform on bind', () => {
        const material = createMaterial(
          [{ name: 'u_color', type: glTypes.vec4 }],
          'uniform vec4 u_color;\nuniform float u_time;',
        );

        material.setUniform('u_time', 1);
        material.setUniform('u_color', new Float32Array(4));
        material.bind(gl);

        expect(gl.uniform1f).not.toHaveBeenCalled();
        expect(gl.uniform1fv).not.toHaveBeenCalled();
        expect(gl.uniform4fv).toHaveBeenCalledTimes(1);
      });

      it('should reach a stripped array by both of its names, sized by its declaration', () => {
        const material = createMaterial(
          [],
          'uniform vec4 u_waves[4];\nuniform float u_single[1];',
        );

        expect(() =>
          material.setUniform('u_waves', new Float32Array(16)),
        ).not.toThrow();
        expect(() =>
          material.setUniform('u_waves[0]', new Float32Array(16)),
        ).not.toThrow();
        expect(() =>
          material.setUniform('u_waves', new Float32Array(20)),
        ).toThrow('is declared as vec4[4]');
        expect(() => material.setUniform('u_single[0]', 1)).not.toThrow();
      });

      it('should validate an array against its declared size when the program reports fewer elements', () => {
        const material = createMaterial(
          [{ name: 'u_waves[0]', type: glTypes.vec4, size: 2 }],
          'uniform vec4 u_waves[4];',
        );
        const waves = new Float32Array(16);

        material.setUniform('u_waves', waves);
        material.bind(gl);

        expect(gl.uniform4fv).toHaveBeenCalledWith(
          locationOf('u_waves[0]'),
          waves,
        );
      });

      it('should accept a uniform declared in the vertex shader', () => {
        const material = createMaterial([], '', 'uniform mat3 u_projection;');

        expect(() =>
          material.setUniform('u_projection', new Float32Array(9)),
        ).not.toThrow();
      });

      it('should throw when the two shaders declare a uniform with different types', () => {
        expect(() =>
          createMaterial(
            [],
            'uniform vec2 u_offset;',
            'uniform float u_offset;',
          ),
        ).toThrow(
          /^Uniform "u_offset" is declared as both float and vec2 in material "testShader\d+" \+ "testShader\d+"\.$/,
        );
      });

      it('should say so when the shaders declare no uniforms', () => {
        const material = createMaterial([], '');

        expect(() => material.setUniform('u_time', 1)).toThrow(
          'Declared uniforms: none.',
        );
      });
    });

    describe('uniforms the declarations do not name', () => {
      it('should accept an active struct member, typed from the program', () => {
        const declarations =
          'struct Light { vec4 color; };\nuniform Light u_light;';
        const material = createMaterial(
          [{ name: 'u_light.color', type: glTypes.vec4 }],
          declarations,
        );
        const color = new Float32Array([1, 0, 0, 1]);

        material.setUniform('u_light.color', color);
        material.bind(gl);

        expect(gl.uniform4fv).toHaveBeenCalledWith(
          locationOf('u_light.color'),
          color,
        );
        expect(() => material.setUniform('u_light', color)).toThrow(
          'is not declared in material',
        );
      });

      it('should accept a uniform whose type is a macro only while the program reports it', () => {
        const declarations =
          '#define TINT_TYPE vec4\nuniform TINT_TYPE u_tint;';
        const active = createMaterial(
          [{ name: 'u_tint', type: glTypes.vec4 }],
          declarations,
        );
        const stripped = createMaterial([], declarations);

        expect(() =>
          active.setUniform('u_tint', new Float32Array(4)),
        ).not.toThrow();
        expect(() =>
          stripped.setUniform('u_tint', new Float32Array(4)),
        ).toThrow('is not declared in material');
      });
    });

    describe('setColorUniform', () => {
      it('should upload a color to a vec4 uniform', () => {
        const material = createMaterial([
          { name: 'u_color', type: glTypes.vec4 },
        ]);

        material.setColorUniform('u_color', new Color(1, 0, 0.5, 0.8));
        material.bind(gl);

        expect(gl.uniform4fv).toHaveBeenCalledWith(
          locationOf('u_color'),
          new Float32Array([1, 0, 0.5, 0.8]),
        );
      });

      it('should throw for a uniform that is not a vec4', () => {
        const material = createMaterial([
          { name: 'u_color', type: glTypes.vec3 },
        ]);

        expect(() =>
          material.setColorUniform('u_color', new Color(1, 0, 0.5, 0.8)),
        ).toThrow('Uniform "u_color" is declared as vec3');
      });
    });

    describe('setVectorUniform', () => {
      it('should upload a Vector2 to a vec2 uniform', () => {
        const material = createMaterial([
          { name: 'u_vector', type: glTypes.vec2 },
        ]);

        material.setVectorUniform('u_vector', { x: 1, y: 2 });
        material.bind(gl);

        expect(gl.uniform2fv).toHaveBeenCalledWith(
          locationOf('u_vector'),
          new Float32Array([1, 2]),
        );
      });

      it('should upload a Vector3 to a vec3 uniform', () => {
        const material = createMaterial([
          { name: 'u_vector', type: glTypes.vec3 },
        ]);

        material.setVectorUniform('u_vector', { x: 1, y: 2, z: 3 });
        material.bind(gl);

        expect(gl.uniform3fv).toHaveBeenCalledWith(
          locationOf('u_vector'),
          new Float32Array([1, 2, 3]),
        );
      });
    });

    describe('bind', () => {
      it('should use the program when binding', () => {
        const material = createMaterial([]);

        material.bind(gl);

        expect(gl.useProgram).toHaveBeenCalledWith(mockProgram);
      });

      it('should skip uniforms without values', () => {
        const material = createMaterial([
          { name: 'u_number', type: glTypes.float },
          { name: 'u_flag', type: glTypes.bool },
        ]);

        material.bind(gl);

        expect(gl.useProgram).toHaveBeenCalledWith(mockProgram);
        expect(gl.uniform1f).not.toHaveBeenCalled();
        expect(gl.uniform1i).not.toHaveBeenCalled();
      });

      it('should upload a number with the call matching the declared scalar type', () => {
        const material = createMaterial([
          { name: 'u_float', type: glTypes.float },
          { name: 'u_int', type: glTypes.int },
          { name: 'u_uint', type: glTypes.uint },
        ]);

        material.setUniform('u_float', 42.5);
        material.setUniform('u_int', 7);
        material.setUniform('u_uint', 9);
        material.bind(gl);

        expect(gl.uniform1f).toHaveBeenCalledWith(locationOf('u_float'), 42.5);
        expect(gl.uniform1i).toHaveBeenCalledWith(locationOf('u_int'), 7);
        expect(gl.uniform1ui).toHaveBeenCalledWith(locationOf('u_uint'), 9);
      });

      it('should upload a boolean as an integer', () => {
        const material = createMaterial([
          { name: 'u_flag', type: glTypes.bool },
          { name: 'u_intFlag', type: glTypes.int },
        ]);

        material.setUniform('u_flag', true);
        material.setUniform('u_intFlag', false);
        material.bind(gl);

        expect(gl.uniform1i).toHaveBeenCalledWith(locationOf('u_flag'), 1);
        expect(gl.uniform1i).toHaveBeenCalledWith(locationOf('u_intFlag'), 0);
      });

      it('should bind textures to consecutive texture units', () => {
        const material = createMaterial([
          { name: 'u_texture1', type: glTypes.sampler2D },
          { name: 'u_texture2', type: glTypes.sampler2D },
        ]);
        const texture1 = new WebGLTexture();
        const texture2 = new WebGLTexture();

        material.setUniform('u_texture1', texture1);
        material.setUniform('u_texture2', texture2);
        material.bind(gl);

        expect(gl.activeTexture).toHaveBeenNthCalledWith(1, gl.TEXTURE0);
        expect(gl.bindTexture).toHaveBeenNthCalledWith(
          1,
          gl.TEXTURE_2D,
          texture1,
        );
        expect(gl.uniform1i).toHaveBeenCalledWith(locationOf('u_texture1'), 0);
        expect(gl.activeTexture).toHaveBeenNthCalledWith(2, gl.TEXTURE0 + 1);
        expect(gl.bindTexture).toHaveBeenNthCalledWith(
          2,
          gl.TEXTURE_2D,
          texture2,
        );
        expect(gl.uniform1i).toHaveBeenCalledWith(locationOf('u_texture2'), 1);
      });

      it('should bind a texture to the target its sampler type reads from', () => {
        const material = createMaterial([
          { name: 'u_environment', type: glTypes.samplerCube },
        ]);
        const texture = new WebGLTexture();

        material.setUniform('u_environment', texture);
        material.bind(gl);

        expect(gl.bindTexture).toHaveBeenCalledWith(
          gl.TEXTURE_CUBE_MAP,
          texture,
        );
      });

      it.each([
        ['vec2', glTypes.vec2, 2, 'uniform2fv'],
        ['vec3', glTypes.vec3, 3, 'uniform3fv'],
        ['vec4', glTypes.vec4, 4, 'uniform4fv'],
      ] as const)(
        'should upload a Float32Array to a %s uniform',
        (_glslName, type, length, call) => {
          const material = createMaterial([{ name: 'u_value', type }]);
          const value = new Float32Array(length).fill(1);

          material.setUniform('u_value', value);
          material.bind(gl);

          expect(gl[call]).toHaveBeenCalledWith(locationOf('u_value'), value);
        },
      );

      it.each([
        ['mat3', glTypes.mat3, 9, 'uniformMatrix3fv'],
        ['mat4', glTypes.mat4, 16, 'uniformMatrix4fv'],
      ] as const)(
        'should upload a Float32Array to a %s uniform as a matrix',
        (_glslName, type, length, call) => {
          const material = createMaterial([{ name: 'u_value', type }]);
          const value = new Float32Array(length).fill(1);

          material.setUniform('u_value', value);
          material.bind(gl);

          expect(gl[call]).toHaveBeenCalledWith(
            locationOf('u_value'),
            false,
            value,
          );
        },
      );

      it('should upload 16 floats by declared type rather than by length', () => {
        const material = createMaterial([
          { name: 'u_waves[0]', type: glTypes.vec4, size: 4 },
          { name: 'u_weights[0]', type: glTypes.float, size: 16 },
          { name: 'u_transform', type: glTypes.mat4 },
        ]);
        const waves = new Float32Array(16).fill(1);
        const weights = new Float32Array(16).fill(2);
        const transform = new Float32Array(16).fill(3);

        material.setUniform('u_waves', waves);
        material.setUniform('u_weights', weights);
        material.setUniform('u_transform', transform);
        material.bind(gl);

        expect(gl.uniform4fv).toHaveBeenCalledWith(
          locationOf('u_waves[0]'),
          waves,
        );
        expect(gl.uniform1fv).toHaveBeenCalledWith(
          locationOf('u_weights[0]'),
          weights,
        );
        expect(gl.uniformMatrix4fv).toHaveBeenCalledOnce();
        expect(gl.uniformMatrix4fv).toHaveBeenCalledWith(
          locationOf('u_transform'),
          false,
          transform,
        );
      });

      it('should upload the leading elements of a uniform array from a shorter Float32Array', () => {
        const material = createMaterial([
          { name: 'u_waves[0]', type: glTypes.vec4, size: 4 },
        ]);
        const waves = new Float32Array(8).fill(1);

        material.setUniform('u_waves[0]', waves);
        material.bind(gl);

        expect(gl.uniform4fv).toHaveBeenCalledWith(
          locationOf('u_waves[0]'),
          waves,
        );
      });

      it('should upload a uniform array once when set under both of its names', () => {
        const material = createMaterial([
          { name: 'u_waves[0]', type: glTypes.vec4, size: 4 },
        ]);
        const first = new Float32Array(16).fill(1);
        const second = new Float32Array(16).fill(2);

        material.setUniform('u_waves', first);
        material.setUniform('u_waves[0]', second);
        material.bind(gl);

        expect(gl.uniform4fv).toHaveBeenCalledOnce();
        expect(gl.uniform4fv).toHaveBeenCalledWith(
          locationOf('u_waves[0]'),
          second,
        );
      });

      it('should upload integer, unsigned integer and boolean vectors', () => {
        const material = createMaterial([
          { name: 'u_ints', type: glTypes.ivec2 },
          { name: 'u_unsignedInts', type: glTypes.uvec3 },
          { name: 'u_flags', type: glTypes.bvec2 },
        ]);
        const ints = new Int32Array([1, 2]);
        const unsignedInts = new Uint32Array([1, 2, 3]);
        const flags = new Int32Array([1, 0]);

        material.setUniform('u_ints', ints);
        material.setUniform('u_unsignedInts', unsignedInts);
        material.setUniform('u_flags', flags);
        material.bind(gl);

        expect(gl.uniform2iv).toHaveBeenCalledWith(locationOf('u_ints'), ints);
        expect(gl.uniform3uiv).toHaveBeenCalledWith(
          locationOf('u_unsignedInts'),
          unsignedInts,
        );
        expect(gl.uniform2iv).toHaveBeenCalledWith(
          locationOf('u_flags'),
          flags,
        );
      });

      it('should upload a Vector2 to a vec2 uniform', () => {
        const material = createMaterial([
          { name: 'u_vector', type: glTypes.vec2 },
        ]);

        material.setUniform('u_vector', { x: 1, y: 2 });
        material.bind(gl);

        expect(gl.uniform2fv).toHaveBeenCalledWith(
          locationOf('u_vector'),
          new Float32Array([1, 2]),
        );
      });

      it('should upload the current contents of a Matrix3x3 to a mat3 uniform', () => {
        const material = createMaterial([
          { name: 'u_projection', type: glTypes.mat3 },
        ]);
        const matrix = new Matrix3x3([1, 0, 0, 0, 1, 0, 0, 0, 1]);

        material.setUniform('u_projection', matrix);
        matrix.matrix[0] = 5;
        material.bind(gl);

        expect(gl.uniformMatrix3fv).toHaveBeenCalledWith(
          locationOf('u_projection'),
          false,
          new Float32Array([5, 0, 0, 0, 1, 0, 0, 0, 1]),
        );
      });
    });
  });
});

describe('Material program caching', () => {
  let gl: WebGL2RenderingContext;
  let programCounter: number;

  beforeEach(() => {
    programCounter = 0;

    gl = {
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
      COMPILE_STATUS: 35713,
      LINK_STATUS: 35714,
      ACTIVE_UNIFORMS: 35718,
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      getShaderInfoLog: vi.fn(() => ''),
      deleteShader: vi.fn(),
      createProgram: vi.fn(() => {
        programCounter += 1;

        return { id: programCounter };
      }),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      getProgramInfoLog: vi.fn(() => ''),
      deleteProgram: vi.fn(),
      getActiveUniform: vi.fn(() => null),
      getUniformLocation: vi.fn(),
    } as unknown as WebGL2RenderingContext;
  });

  it('should compile a new program for different shader source', () => {
    const vertexShaderA = createShaderSource(
      'void main() { gl_Position = vec4(0.0); }',
    );
    const fragmentShaderA = createShaderSource(
      'void main() { gl_FragColor = vec4(1.0); }',
    );
    const vertexShaderB = createShaderSource(
      'void main() { gl_Position = vec4(1.0); }',
    );
    const fragmentShaderB = createShaderSource(
      'void main() { gl_FragColor = vec4(0.0); }',
    );

    const materialA = new Material(vertexShaderA, fragmentShaderA, gl);
    const materialB = new Material(vertexShaderB, fragmentShaderB, gl);

    expect(gl.createProgram).toHaveBeenCalledTimes(2);
    expect(materialA.program).not.toBe(materialB.program);
  });
});
