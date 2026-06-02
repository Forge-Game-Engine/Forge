import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createShader } from './compile-shader';

describe('createShader', () => {
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    // Create a mock WebGL2RenderingContext
    gl = {
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(),
      getShaderInfoLog: vi.fn(),
      deleteShader: vi.fn(),
    } as unknown as WebGL2RenderingContext;
  });

  it('should create and compile a shader successfully', () => {
    const shader = {} as WebGLShader;
    (gl.createShader as Mock).mockReturnValue(shader);
    (gl.getShaderParameter as Mock).mockReturnValue(true);

    const source = 'void main() {}';
    const type = gl.VERTEX_SHADER;

    const result = createShader(gl, source, type);

    expect(gl.createShader).toHaveBeenCalledWith(type);
    expect(gl.shaderSource).toHaveBeenCalledWith(shader, source);
    expect(gl.compileShader).toHaveBeenCalledWith(shader);
    expect(gl.getShaderParameter).toHaveBeenCalledWith(
      shader,
      gl.COMPILE_STATUS,
    );
    expect(result).toBe(shader);
  });

  it('should throw an error if shader creation fails', () => {
    (gl.createShader as Mock).mockReturnValue(null);

    const source = 'void main() {}';
    const type = gl.VERTEX_SHADER;

    expect(() => createShader(gl, source, type)).toThrow(
      'Shader creation error',
    );
  });

  it('should throw an error if shader compilation fails', () => {
    const shader = {} as WebGLShader;
    (gl.createShader as Mock).mockReturnValue(shader);
    (gl.getShaderParameter as Mock).mockReturnValue(false);
    (gl.getShaderInfoLog as Mock).mockReturnValue('Compilation error');

    const source = 'void main() {}';
    const type = gl.VERTEX_SHADER;

    expect(() => createShader(gl, source, type)).toThrow(
      'Shader compile error: Compilation error',
    );
    expect(gl.deleteShader).toHaveBeenCalledWith(shader);
  });
});
