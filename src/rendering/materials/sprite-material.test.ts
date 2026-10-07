/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import { RenderContext } from '../render-context.js';
import {
  ForgeShaderSource,
  ShaderCache,
  spriteFragmentShader,
  spriteVertexShader,
} from '../shaders/index.js';
import { Texture } from '../texture.js';
import { createSpriteMaterial } from './sprite-material.js';

const proceduralFragmentShader = `#version 300 es
#pragma forge name(procedural.frag)
precision mediump float;
uniform float u_time;
in vec4 v_tint;
out vec4 fragColor;
#pragma forge include(spriteMask)
void main() { fragColor = v_tint * u_time * spriteMaskCoverage(); }`;

const unmaskedFragmentShader = `#version 300 es
#pragma forge name(unmasked.frag)
precision mediump float;
in vec4 v_tint;
out vec4 fragColor;
void main() { fragColor = v_tint; }`;

describe('SpriteMaterial', () => {
  let gl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let activeUniforms: { name: string; type: number }[];

  beforeEach(() => {
    activeUniforms = [];
    gl = {
      ACTIVE_UNIFORMS: 'ACTIVE_UNIFORMS',
      TEXTURE0: 0,
      TEXTURE_2D: 'TEXTURE_2D',
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
      uniform1i: vi.fn(),
      uniform1fv: vi.fn(),
      uniform1f: vi.fn(),
      uniformMatrix3fv: vi.fn(),
      activeTexture: vi.fn(),
      bindTexture: vi.fn(),
      createTexture: vi.fn(() => ({})),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    const canvas = document.createElement('canvas');

    vi.spyOn(canvas, 'getContext').mockReturnValue(gl);

    const shaderCache = new ShaderCache([])
      .addShader(new ForgeShaderSource(spriteVertexShader))
      .addShader(new ForgeShaderSource(spriteFragmentShader))
      .addShader(new ForgeShaderSource(proceduralFragmentShader))
      .addShader(new ForgeShaderSource(unmaskedFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
  });

  it("throws for a fragment shader that doesn't include spriteMask", () => {
    expect(() => createSpriteMaterial(renderContext, 'unmasked.frag')).toThrow(
      'must include "spriteMask"',
    );
  });

  it('pairs sprite.vert with the named fragment shader, sharing one program', () => {
    const first = createSpriteMaterial(renderContext, 'sprite.frag');
    const second = createSpriteMaterial(renderContext, 'sprite.frag');

    expect(first.program).toBe(second.program);
    expect(first.program).toBe(renderContext.spriteMaterial.program);
    expect(gl.linkProgram).toHaveBeenCalledTimes(1);
  });

  it.each(['u_texture', 'u_emissiveTexture'])(
    'does not let %s be set, since the render system sets it per sprite',
    (name) => {
      const material = createSpriteMaterial(renderContext, 'sprite.frag');

      expect(() => material.setUniform(name, new Texture(gl))).toThrow(
        'set by the render system',
      );
    },
  );

  it("binds the sprites' texture and emissive map to the samplers its shader declares", () => {
    activeUniforms = [
      { name: 'u_texture', type: 0x8b5e /* SAMPLER_2D */ },
      { name: 'u_emissiveTexture', type: 0x8b5e /* SAMPLER_2D */ },
    ];

    const material = createSpriteMaterial(renderContext, 'sprite.frag');
    const texture = new Texture(gl);
    const emissiveTexture = new Texture(gl);

    (gl.bindTexture as Mock).mockClear();

    expect(material.bindSprites(gl, texture, emissiveTexture)).toBe(2);
    expect((gl.bindTexture as Mock).mock.calls).toEqual([
      [gl.TEXTURE_2D, texture.glTexture],
      [gl.TEXTURE_2D, emissiveTexture.glTexture],
    ]);
  });

  it('draws with a procedural shader that declares neither sampler', () => {
    activeUniforms = [{ name: 'u_time', type: 0x1406 /* FLOAT */ }];

    const material = createSpriteMaterial(renderContext, 'procedural.frag');

    material.setUniform('u_time', 2);

    expect(() =>
      material.bindSprites(
        gl,
        renderContext.whiteTexture,
        renderContext.blackTexture,
      ),
    ).not.toThrow();
    expect(gl.uniform1f).toHaveBeenCalledWith({ name: 'u_time' }, 2);
  });
});
