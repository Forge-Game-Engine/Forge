import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ProgramCache } from './program-cache';
import { createShader } from './compile-shader';

vi.mock('./compile-shader', () => ({
  createShader: vi.fn(),
}));

describe('ProgramCache', () => {
  let gl: WebGL2RenderingContext;
  let vertexShader: WebGLShader;
  let fragmentShader: WebGLShader;
  let programCache: ProgramCache;

  beforeEach(() => {
    vertexShader = {} as WebGLShader;
    fragmentShader = {} as WebGLShader;
    programCache = new ProgramCache();

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

  it('compiles a program on first use', () => {
    const program = programCache.getProgram(
      gl,
      'vertex source',
      'fragment source',
    );

    expect(gl.createProgram).toHaveBeenCalledTimes(1);
    expect(program).toBeDefined();
  });

  it('returns the cached program for identical source', () => {
    const first = programCache.getProgram(
      gl,
      'vertex source',
      'fragment source',
    );
    const second = programCache.getProgram(
      gl,
      'vertex source',
      'fragment source',
    );

    expect(gl.createProgram).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('compiles a new program for different source', () => {
    programCache.getProgram(gl, 'vertex source', 'fragment source');
    programCache.getProgram(gl, 'other vertex source', 'fragment source');

    expect(gl.createProgram).toHaveBeenCalledTimes(2);
  });

  it('distinguishes shader pairs where the concatenation would collide', () => {
    // Without a delimiter between the two hashes, ('ab', 'c') and ('a',
    // 'bc') would otherwise be indistinguishable.
    programCache.getProgram(gl, 'ab', 'c');
    programCache.getProgram(gl, 'a', 'bc');

    expect(gl.createProgram).toHaveBeenCalledTimes(2);
  });

  it('does not share its cache with a different ProgramCache instance', () => {
    const otherProgramCache = new ProgramCache();

    programCache.getProgram(gl, 'vertex source', 'fragment source');
    otherProgramCache.getProgram(gl, 'vertex source', 'fragment source');

    expect(gl.createProgram).toHaveBeenCalledTimes(2);
  });
});
