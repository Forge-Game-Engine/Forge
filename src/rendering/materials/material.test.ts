/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { Material } from './material';
import { Matrix3x3, Vector2, Vector3 } from '../../math/index.js';
import { Color } from '../color.js';

// Mock WebGLTexture constructor for instanceof checks

globalThis.WebGLTexture = class WebGLTexture {};

describe('Material', () => {
  let gl: WebGL2RenderingContext;
  let mockProgram: WebGLProgram;
  let mockVertexShader: WebGLShader;

  beforeEach(() => {
    // Create mock shaders and program
    mockProgram = {} as WebGLProgram;
    mockVertexShader = {} as WebGLShader;

    // Create a mock WebGL2RenderingContext with all necessary methods
    gl = {
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
      COMPILE_STATUS: 35713,
      LINK_STATUS: 35714,
      ACTIVE_UNIFORMS: 35718,
      TEXTURE0: 33984,
      TEXTURE_2D: 3553,
      createShader: vi.fn(() => mockVertexShader),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      getShaderInfoLog: vi.fn(() => ''),
      createProgram: vi.fn(() => mockProgram),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      getProgramInfoLog: vi.fn(() => ''),
      getActiveUniform: vi.fn(),
      getUniformLocation: vi.fn(),
      useProgram: vi.fn(),
      uniform1f: vi.fn(),
      uniform1i: vi.fn(),
      uniform1iv: vi.fn(),
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

      const vertexShader = 'void main() { gl_Position = vec4(0.0); }';
      const fragmentShader = 'void main() { gl_FragColor = vec4(1.0); }';

      const material = new Material(vertexShader, fragmentShader, gl);

      expect(material.program).toBe(mockProgram);
      expect(gl.createProgram).toHaveBeenCalled();
      expect(gl.linkProgram).toHaveBeenCalledWith(mockProgram);
    });

    it('should throw an error if shader compilation fails', () => {
      // Setup: shader compilation should fail
      (gl.getShaderParameter as Mock).mockReturnValue(false);
      (gl.getShaderInfoLog as Mock).mockReturnValue('Shader compile error');

      const vertexShader = 'invalid shader';
      const fragmentShader = 'void main() { gl_FragColor = vec4(1.0); }';

      expect(() => new Material(vertexShader, fragmentShader, gl)).toThrow(
        'Shader compile error: Shader compile error',
      );
    });

    it('should throw an error if program linking fails', () => {
      // Setup: program linking should fail
      (gl.getShaderParameter as Mock).mockReturnValue(true);
      (gl.getProgramParameter as Mock).mockReturnValue(false);
      (gl.getProgramInfoLog as Mock).mockReturnValue('Link error');

      const vertexShader = 'void main() { gl_Position = vec4(0.0); }';
      const fragmentShader = 'void main() { gl_FragColor = vec4(1.0); }';

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

      const vertexShader = 'uniform vec4 uColor; void main() {}';
      const fragmentShader = 'uniform sampler2D uTexture; void main() {}';

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

  describe('setUniform', () => {
    let material: Material;
    const mockLocation = {} as WebGLUniformLocation;

    beforeEach(() => {
      (gl.getProgramParameter as Mock).mockReturnValue(1);
      (gl.getActiveUniform as Mock).mockReturnValue({
        name: 'uTestUniform',
        type: 5126,
        size: 1,
      });
      (gl.getUniformLocation as Mock).mockReturnValue(mockLocation);

      const vertexShader = 'void main() {}';
      const fragmentShader = 'void main() {}';
      material = new Material(vertexShader, fragmentShader, gl);
    });

    it('should set a uniform value', () => {
      material.setUniform('uTestUniform', 42);

      // Verify the uniform was stored (we'll test binding separately)
      expect(() => material.setUniform('uTestUniform', 42)).not.toThrow();
    });

    it('should throw an error when setting a non-existent uniform', () => {
      expect(() => material.setUniform('uNonExistent', 42)).toThrow(
        'Uniform "uNonExistent" does not exist on material. Available uniforms are: uTestUniform.',
      );
    });

    it('should allow setting different types of uniform values', () => {
      const float32Array = new Float32Array([1, 2, 3]);
      const int32Array = new Int32Array([1, 2, 3]);
      const vector2 = new Vector2(1, 2);
      const matrix = new Matrix3x3([1, 0, 0, 0, 1, 0, 0, 0, 1]);

      expect(() => material.setUniform('uTestUniform', 42)).not.toThrow();
      expect(() => material.setUniform('uTestUniform', true)).not.toThrow();
      expect(() =>
        material.setUniform('uTestUniform', float32Array),
      ).not.toThrow();
      expect(() =>
        material.setUniform('uTestUniform', int32Array),
      ).not.toThrow();
      expect(() => material.setUniform('uTestUniform', vector2)).not.toThrow();
      expect(() => material.setUniform('uTestUniform', matrix)).not.toThrow();
    });
  });

  describe('setColorUniform', () => {
    let material: Material;
    const mockLocation = {} as WebGLUniformLocation;

    beforeEach(() => {
      (gl.getProgramParameter as Mock).mockReturnValue(1);
      (gl.getActiveUniform as Mock).mockReturnValue({
        name: 'uColor',
        type: 5126,
        size: 1,
      });
      (gl.getUniformLocation as Mock).mockReturnValue(mockLocation);

      const vertexShader = 'void main() {}';
      const fragmentShader = 'void main() {}';
      material = new Material(vertexShader, fragmentShader, gl);
    });

    it('should set a color uniform', () => {
      const color = new Color(1, 0, 0.5, 0.8);

      expect(() => material.setColorUniform('uColor', color)).not.toThrow();
    });
  });

  describe('setVectorUniform', () => {
    let material: Material;
    const mockLocation = {} as WebGLUniformLocation;

    beforeEach(() => {
      (gl.getProgramParameter as Mock).mockReturnValue(1);
      (gl.getActiveUniform as Mock).mockReturnValue({
        name: 'uVector',
        type: 5126,
        size: 1,
      });
      (gl.getUniformLocation as Mock).mockReturnValue(mockLocation);

      const vertexShader = 'void main() {}';
      const fragmentShader = 'void main() {}';
      material = new Material(vertexShader, fragmentShader, gl);
    });

    it('should set a Vector2 uniform', () => {
      const vector2 = new Vector2(1, 2);

      expect(() => material.setVectorUniform('uVector', vector2)).not.toThrow();
    });

    it('should set a Vector3 uniform', () => {
      const vector3 = new Vector3(1, 2, 3);

      expect(() => material.setVectorUniform('uVector', vector3)).not.toThrow();
    });
  });

  describe('bind', () => {
    let material: Material;
    const mockLocation = {} as WebGLUniformLocation;

    beforeEach(() => {
      (gl.getProgramParameter as Mock).mockReturnValue(3);
      (gl.getActiveUniform as Mock)
        .mockReturnValueOnce({ name: 'uNumber', type: 5126, size: 1 })
        .mockReturnValueOnce({ name: 'uBoolean', type: 5126, size: 1 })
        .mockReturnValueOnce({ name: 'uTexture', type: 5126, size: 1 });
      (gl.getUniformLocation as Mock).mockReturnValue(mockLocation);

      const vertexShader = 'void main() {}';
      const fragmentShader = 'void main() {}';
      material = new Material(vertexShader, fragmentShader, gl);
    });

    it('should use the program when binding', () => {
      material.bind(gl);

      expect(gl.useProgram).toHaveBeenCalledWith(mockProgram);
    });

    it('should bind a number uniform', () => {
      material.setUniform('uNumber', 42.5);
      material.bind(gl);

      expect(gl.uniform1f).toHaveBeenCalledWith(mockLocation, 42.5);
    });

    it('should bind a boolean uniform as integer', () => {
      material.setUniform('uBoolean', true);
      material.bind(gl);

      expect(gl.uniform1i).toHaveBeenCalledWith(mockLocation, 1);

      vi.clearAllMocks();
      material.setUniform('uBoolean', false);
      material.bind(gl);

      expect(gl.uniform1i).toHaveBeenCalledWith(mockLocation, 0);
    });

    it('should bind a texture uniform', () => {
      const mockTexture = new WebGLTexture();
      material.setUniform('uTexture', mockTexture);
      material.bind(gl);

      expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0);
      expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, mockTexture);
      expect(gl.uniform1i).toHaveBeenCalledWith(mockLocation, 0);
    });

    it('should bind multiple textures with correct texture units', () => {
      (gl.getProgramParameter as Mock).mockReturnValue(2);
      (gl.getActiveUniform as Mock)
        .mockReturnValueOnce({ name: 'uTexture1', type: 5126, size: 1 })
        .mockReturnValueOnce({ name: 'uTexture2', type: 5126, size: 1 });

      const vertexShader = 'void main() {}';
      const fragmentShader = 'void main() {}';
      const newMaterial = new Material(vertexShader, fragmentShader, gl);

      const mockTexture1 = new WebGLTexture();
      const mockTexture2 = new WebGLTexture();

      newMaterial.setUniform('uTexture1', mockTexture1);
      newMaterial.setUniform('uTexture2', mockTexture2);

      vi.clearAllMocks();
      newMaterial.bind(gl);

      expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + 0);
      expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, mockTexture1);
      expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + 1);
      expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, mockTexture2);
    });

    it('should bind a Float32Array vec2 uniform', () => {
      material.setUniform('uNumber', new Float32Array([1, 2]));
      material.bind(gl);

      expect(gl.uniform2fv).toHaveBeenCalledWith(
        mockLocation,
        new Float32Array([1, 2]),
      );
    });

    it('should bind a Float32Array vec3 uniform', () => {
      material.setUniform('uNumber', new Float32Array([1, 2, 3]));
      material.bind(gl);

      expect(gl.uniform3fv).toHaveBeenCalledWith(
        mockLocation,
        new Float32Array([1, 2, 3]),
      );
    });

    it('should bind a Float32Array vec4 uniform', () => {
      material.setUniform('uNumber', new Float32Array([1, 2, 3, 4]));
      material.bind(gl);

      expect(gl.uniform4fv).toHaveBeenCalledWith(
        mockLocation,
        new Float32Array([1, 2, 3, 4]),
      );
    });

    it('should bind a Float32Array mat3 uniform', () => {
      const mat3 = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      material.setUniform('uNumber', mat3);
      material.bind(gl);

      expect(gl.uniformMatrix3fv).toHaveBeenCalledWith(
        mockLocation,
        false,
        mat3,
      );
    });

    it('should bind a Float32Array mat4 uniform', () => {
      const mat4 = new Float32Array([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      ]);
      material.setUniform('uNumber', mat4);
      material.bind(gl);

      expect(gl.uniformMatrix4fv).toHaveBeenCalledWith(
        mockLocation,
        false,
        mat4,
      );
    });

    it('should bind an Int32Array uniform', () => {
      const intArray = new Int32Array([1, 2, 3]);
      material.setUniform('uNumber', intArray);
      material.bind(gl);

      expect(gl.uniform1iv).toHaveBeenCalledWith(mockLocation, intArray);
    });

    it('should bind a Vector2 uniform', () => {
      const vector2 = new Vector2(1, 2);
      material.setUniform('uNumber', vector2);
      material.bind(gl);

      expect(gl.uniform2fv).toHaveBeenCalledWith(
        mockLocation,
        new Float32Array([1, 2]),
      );
    });

    it('should bind a Matrix3x3 uniform', () => {
      const matrix = new Matrix3x3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
      material.setUniform('uNumber', matrix);
      material.bind(gl);

      expect(gl.uniformMatrix3fv).toHaveBeenCalledWith(
        mockLocation,
        false,
        matrix.matrix,
      );
    });

    it('should skip uniforms without values', () => {
      // Don't set any uniforms, just bind
      material.bind(gl);

      // Should only call useProgram, but not any uniform setters
      expect(gl.useProgram).toHaveBeenCalledWith(mockProgram);
      expect(gl.uniform1f).not.toHaveBeenCalled();
      expect(gl.uniform1i).not.toHaveBeenCalled();
    });
  });
});
