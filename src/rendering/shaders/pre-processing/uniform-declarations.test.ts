import { describe, expect, it } from 'vitest';
import {
  isUniformDeclarationLine,
  parseUniformDeclarations,
  UniformSourceDeclaration,
} from './uniform-declarations';

const parse = (source: string): UniformSourceDeclaration[] => [
  ...parseUniformDeclarations(source, 'test.frag').values(),
];

const scalar = (
  name: string,
  glslTypeName: string,
): UniformSourceDeclaration => ({
  name,
  glslTypeName,
  isArray: false,
  size: 1,
});

const array = (
  name: string,
  glslTypeName: string,
  size: number,
): UniformSourceDeclaration => ({ name, glslTypeName, isArray: true, size });

describe('parseUniformDeclarations', () => {
  it('should read plain declarations in order', () => {
    expect(
      parse(`
        uniform sampler2D u_texture;
        uniform float u_time;
      `),
    ).toEqual([scalar('u_texture', 'sampler2D'), scalar('u_time', 'float')]);
  });

  it('should ignore precision and layout qualifiers', () => {
    expect(
      parse(`
        uniform highp vec2 u_resolution;
        layout(location = 3) uniform mediump float u_scale;
      `),
    ).toEqual([scalar('u_resolution', 'vec2'), scalar('u_scale', 'float')]);
  });

  it('should read several names declared in one statement', () => {
    expect(parse('uniform vec4 u_a, u_b[2], u_c;')).toEqual([
      scalar('u_a', 'vec4'),
      array('u_b', 'vec4', 2),
      scalar('u_c', 'vec4'),
    ]);
  });

  it('should read both array spellings', () => {
    expect(parse('uniform vec4 u_a[4];\nuniform vec4[3] u_b, u_c;')).toEqual([
      array('u_a', 'vec4', 4),
      array('u_b', 'vec4', 3),
      array('u_c', 'vec4', 3),
    ]);
  });

  it('should report an array of one element as an array', () => {
    expect(parse('uniform float u_single[1];')).toEqual([
      array('u_single', 'float', 1),
    ]);
  });

  it('should resolve array sizes from #define and const int', () => {
    expect(
      parse(`
        #define MAX_WAVES 8
        const int MAX_LIGHTS = 3;
        const highp int MAX_STEPS = 2u;
        uniform vec4 u_waves[MAX_WAVES];
        uniform vec3 u_lights[ MAX_LIGHTS ];
        uniform float u_steps[MAX_STEPS];
      `),
    ).toEqual([
      array('u_waves', 'vec4', 8),
      array('u_lights', 'vec3', 3),
      array('u_steps', 'float', 2),
    ]);
  });

  it('should throw for an array size it cannot resolve', () => {
    expect(() => parse('#define N 2\nuniform vec4 u_waves[N * 2];')).toThrow(
      'Uniform "u_waves" in shader "test.frag" has the array size "N * 2", which Forge can\'t resolve. Use an integer literal, a "#define NAME <integer>" or a "const int NAME = <integer>;" for the size.',
    );
    expect(() => parse('uniform vec4 u_waves[UNKNOWN];')).toThrow(
      'has the array size "UNKNOWN"',
    );
  });

  it('should report the matNxN aliases by their short names', () => {
    expect(
      parse('uniform mat2x2 u_a;\nuniform mat3x3 u_b;\nuniform mat4x4 u_c;'),
    ).toEqual([
      scalar('u_a', 'mat2'),
      scalar('u_b', 'mat3'),
      scalar('u_c', 'mat4'),
    ]);
  });

  it('should report a struct-typed uniform by its struct name', () => {
    expect(
      parse(`
        struct Light { vec3 position; vec4 color; };
        uniform Light u_light;
      `),
    ).toEqual([scalar('u_light', 'Light')]);
  });

  it('should ignore declarations inside comments', () => {
    expect(
      parse(`
        // uniform float u_lineComment;
        /* uniform float u_blockComment;
           uniform float u_alsoComment; */
        uniform float u_real; // uniform float u_trailing;
      `),
    ).toEqual([scalar('u_real', 'float')]);
  });

  it('should skip uniform blocks and inline struct declarations', () => {
    expect(
      parse(`
        layout(std140) uniform Camera {
          mat4 view;
          mat4 projection;
        } camera;
        uniform struct Fog { float density; } u_fog;
        uniform float u_after;
      `),
    ).toEqual([scalar('u_after', 'float')]);
  });

  it('should not read a directive as a declaration', () => {
    expect(parse('#define DECLARE uniform\nuniform float u_time;')).toEqual([
      scalar('u_time', 'float'),
    ]);
  });

  it('should not match identifiers that contain "uniform"', () => {
    expect(parse('float my_uniform = 1.0;\nuniform float u_x;')).toEqual([
      scalar('u_x', 'float'),
    ]);
  });

  it('should read a declaration that spans lines', () => {
    expect(parse('uniform vec4\n  u_a,\n  u_b;')).toEqual([
      scalar('u_a', 'vec4'),
      scalar('u_b', 'vec4'),
    ]);
  });

  it('should treat declarations in every preprocessor branch as declared', () => {
    expect(
      parse(`
        #ifdef USE_FOG
        uniform float u_fogDensity;
        #else
        uniform float u_fogDensity;
        uniform vec3 u_ambient;
        #endif
      `),
    ).toEqual([scalar('u_fogDensity', 'float'), scalar('u_ambient', 'vec3')]);
  });

  it('should throw for the same name declared with different types or sizes', () => {
    expect(() => parse('uniform float u_x;\nuniform vec2 u_x;')).toThrow(
      'Uniform "u_x" is declared as both float and vec2 in shader "test.frag".',
    );
    expect(() => parse('uniform vec4 u_x[2];\nuniform vec4 u_x[3];')).toThrow(
      'is declared as both vec4[2] and vec4[3]',
    );
  });

  it('should throw for a declaration it cannot read', () => {
    expect(() => parse('uniform float u_x = 1.0;')).toThrow(
      'Unable to read the uniform declaration "uniform float u_x = 1.0;" in shader "test.frag".',
    );
    expect(() => parse('uniform vec4[2] u_x[2];')).toThrow(
      'Unable to read the uniform declaration',
    );
  });
});

describe('isUniformDeclarationLine', () => {
  it.each([
    'uniform float u_time;',
    '  uniform highp vec4 u_waves[4], u_color;',
    'layout(location = 0) uniform mat4 u_mvp;',
    'uniform vec4[2] u_pair;',
  ])('should match "%s"', (line) => {
    expect(isUniformDeclarationLine(line)).toBe(true);
  });

  it.each([
    'in vec2 v_uv;',
    'uniform Camera {',
    'float my_uniform = 1.0;',
    '// uniform float u_time;',
  ])('should not match "%s"', (line) => {
    expect(isUniformDeclarationLine(line)).toBe(false);
  });
});
