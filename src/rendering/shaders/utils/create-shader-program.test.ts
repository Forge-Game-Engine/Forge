import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createCachedProgram, createProgram } from './create-shader-program';
import { createShader } from './compile-shader';

vi.mock('./compile-shader', () => ({
  createShader: vi.fn(),
}));

describe('createProgram', () => {
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    // Create a mock WebGL2RenderingContext
    gl = {
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(),
      getProgramInfoLog: vi.fn(),
      deleteProgram: vi.fn(),
      deleteShader: vi.fn(),
    } as unknown as WebGL2RenderingContext;
  });

  it('should create and link a shader program successfully', () => {
    const program = {} as WebGLProgram;
    const vertexShader = {} as WebGLShader;
    const fragmentShader = {} as WebGLShader;

    (gl.createProgram as Mock).mockReturnValue(program);
    (gl.getProgramParameter as Mock).mockReturnValue(true);
    (createShader as Mock).mockImplementation(
      (gl: WebGL2RenderingContext, _source, type) => {
        return type === gl.VERTEX_SHADER ? vertexShader : fragmentShader;
      },
    );

    const vertexSource = 'vertex shader source';
    const fragmentSource = 'fragment shader source';

    const result = createProgram(gl, vertexSource, fragmentSource);

    expect(gl.createProgram).toHaveBeenCalled();
    expect(createShader).toHaveBeenCalledWith(
      gl,
      vertexSource,
      gl.VERTEX_SHADER,
    );
    expect(createShader).toHaveBeenCalledWith(
      gl,
      fragmentSource,
      gl.FRAGMENT_SHADER,
    );
    expect(gl.attachShader).toHaveBeenCalledWith(program, vertexShader);
    expect(gl.attachShader).toHaveBeenCalledWith(program, fragmentShader);
    expect(gl.linkProgram).toHaveBeenCalledWith(program);
    expect(gl.getProgramParameter).toHaveBeenCalledWith(
      program,
      gl.LINK_STATUS,
    );
    expect(result).toBe(program);
  });

  it('should throw an error if program creation fails', () => {
    (gl.createProgram as Mock).mockReturnValue(null);

    const vertexSource = 'vertex shader source';
    const fragmentSource = 'fragment shader source';

    expect(() => createProgram(gl, vertexSource, fragmentSource)).toThrow(
      'Program creation error',
    );
  });

  it('should throw an error if program linking fails', () => {
    const program = {} as WebGLProgram;
    const vertexShader = {} as WebGLShader;
    const fragmentShader = {} as WebGLShader;

    (gl.createProgram as Mock).mockReturnValue(program);
    (gl.getProgramParameter as Mock).mockReturnValue(false);
    (gl.getProgramInfoLog as Mock).mockReturnValue('Linking error');
    (createShader as Mock).mockImplementation(
      (gl: WebGL2RenderingContext, _source, type) => {
        return type === gl.VERTEX_SHADER ? vertexShader : fragmentShader;
      },
    );

    const vertexSource = 'vertex shader source';
    const fragmentSource = 'fragment shader source';

    expect(() => createProgram(gl, vertexSource, fragmentSource)).toThrow(
      'Program link error: Linking error',
    );
    expect(gl.deleteProgram).toHaveBeenCalledWith(program);
    expect(gl.deleteShader).toHaveBeenCalledWith(vertexShader);
    expect(gl.deleteShader).toHaveBeenCalledWith(fragmentShader);
  });
});

describe('createCachedProgram', () => {
  let gl: WebGL2RenderingContext;
  let vertexShader: WebGLShader;
  let fragmentShader: WebGLShader;

  beforeEach(() => {
    vertexShader = {} as WebGLShader;
    fragmentShader = {} as WebGLShader;

    gl = {
      createProgram: vi.fn(() => ({}) as WebGLProgram),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      getProgramInfoLog: vi.fn(),
      deleteProgram: vi.fn(),
      deleteShader: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    (createShader as Mock).mockImplementation(
      (gl: WebGL2RenderingContext, _source, type) =>
        type === gl.VERTEX_SHADER ? vertexShader : fragmentShader,
    );
  });

  it('should compile a program on first use', () => {
    const program = createCachedProgram(gl, 'vertex source', 'fragment source');

    expect(gl.createProgram).toHaveBeenCalledTimes(1);
    expect(program).toBeDefined();
  });

  it('should return the cached program for identical source on the same context', () => {
    const first = createCachedProgram(gl, 'vertex source', 'fragment source');
    const second = createCachedProgram(gl, 'vertex source', 'fragment source');

    expect(gl.createProgram).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('should compile a new program for different source', () => {
    createCachedProgram(gl, 'vertex source', 'fragment source');
    createCachedProgram(gl, 'other vertex source', 'fragment source');

    expect(gl.createProgram).toHaveBeenCalledTimes(2);
  });

  it('should not share the cache across different WebGL contexts', () => {
    const otherGl = {
      createProgram: vi.fn(() => ({}) as WebGLProgram),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      getProgramInfoLog: vi.fn(),
      deleteProgram: vi.fn(),
      deleteShader: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    createCachedProgram(gl, 'vertex source', 'fragment source');
    createCachedProgram(otherGl, 'vertex source', 'fragment source');

    expect(gl.createProgram).toHaveBeenCalledTimes(1);
    expect(otherGl.createProgram).toHaveBeenCalledTimes(1);
  });
});
