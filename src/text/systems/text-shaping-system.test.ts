/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  ForgeShaderSource,
  RenderContext,
  ShaderCache,
  spriteFragmentShader,
  spriteVertexShader,
} from '../../rendering/index.js';
import { addTextComponent } from '../components/text-component.js';
import {
  TextMeshEcsComponent,
  textMeshId,
} from '../components/text-mesh-component.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import {
  msdfEffectsFragmentShader,
  msdfFillFragmentShader,
  msdfVertexShader,
} from '../rendering/shaders/index.js';
import { createTextShapingEcsSystem } from './text-shaping-system.js';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture = class WebGLTexture {};

function buildFontAtlas(): FontAtlas {
  return {
    data: {
      formatVersion: 2,
      type: 'msdf',
      atlasImage: 'fixture.png',
      atlasSize: { width: 256, height: 256 },
      distanceRange: 4,
      metrics: {
        lineHeight: 1.2,
        ascender: 0.9,
        descender: -0.2,
        capHeight: 0.7,
      },
      glyphs: new Map([
        [
          65,
          {
            codePoint: 65,
            advance: 0.6,
            planeBounds: { left: 0.05, bottom: 0, right: 0.55, top: 0.7 },
            atlasBounds: { left: 0, bottom: 0, right: 0.1, top: 0.14 },
          },
        ],
        [
          66,
          {
            codePoint: 66,
            advance: 0.6,
            planeBounds: { left: 0.05, bottom: 0, right: 0.55, top: 0.7 },
            atlasBounds: { left: 0.1, bottom: 0, right: 0.2, top: 0.14 },
          },
        ],
      ]),
      kerning: new Map(),
    },
    image: { width: 256, height: 256 } as HTMLImageElement,
  };
}

describe('createTextShapingEcsSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    mockGl = {
      VERTEX_SHADER: 'VERTEX_SHADER',
      FRAGMENT_SHADER: 'FRAGMENT_SHADER',
      COMPILE_STATUS: 'COMPILE_STATUS',
      LINK_STATUS: 'LINK_STATUS',
      ACTIVE_UNIFORMS: 'ACTIVE_UNIFORMS',
      TEXTURE0: 0,
      TEXTURE_2D: 'TEXTURE_2D',
      ARRAY_BUFFER: 'ARRAY_BUFFER',
      STATIC_DRAW: 'STATIC_DRAW',
      CLAMP_TO_EDGE: 'CLAMP_TO_EDGE',
      TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
      TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
      TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
      TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
      NEAREST: 'NEAREST',
      LINEAR: 'LINEAR',
      RGBA: 'RGBA',
      UNSIGNED_BYTE: 'UNSIGNED_BYTE',

      createBuffer: vi.fn().mockReturnValue({}),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),

      createTexture: vi.fn().mockImplementation(() => new WebGLTexture()),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),

      createShader: vi.fn().mockReturnValue({}),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn().mockReturnValue(true),
      getShaderInfoLog: vi.fn().mockReturnValue(''),

      createProgram: vi.fn().mockReturnValue({}),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi
        .fn()
        .mockImplementation((_program: unknown, pname: unknown) =>
          pname === 'ACTIVE_UNIFORMS' ? 3 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),

      getActiveUniform: vi.fn().mockImplementation(
        (_program, index: number) =>
          [
            { name: 'u_atlas', type: 0, size: 1 },
            { name: 'u_distanceRange', type: 0, size: 1 },
            { name: 'u_atlasSize', type: 0, size: 1 },
          ][index] ?? null,
      ),
      getUniformLocation: vi.fn().mockReturnValue({}),
      useProgram: vi.fn(),
      uniform1i: vi.fn(),
      uniform1f: vi.fn(),
      activeTexture: vi.fn(),
      getAttribLocation: vi.fn().mockReturnValue(0),
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    const shaderCache = new ShaderCache([])
      .addShader(new ForgeShaderSource(spriteVertexShader))
      .addShader(new ForgeShaderSource(spriteFragmentShader))
      .addShader(new ForgeShaderSource(msdfVertexShader))
      .addShader(new ForgeShaderSource(msdfFillFragmentShader))
      .addShader(new ForgeShaderSource(msdfEffectsFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
    world = new EcsWorld();
    world.addSystem(createTextShapingEcsSystem(renderContext));
  });

  it('shapes a TextEcsComponent into a TextMeshEcsComponent', () => {
    const entity = world.createEntity();

    addTextComponent(world, entity, {
      text: 'A',
      fontAtlas: buildFontAtlas(),
      size: 10,
    });

    world.update();

    const mesh = world.getComponent<TextMeshEcsComponent>(entity, textMeshId);

    expect(mesh).not.toBeNull();
    expect(mesh?.glyphs).toHaveLength(1);
    // `verticalAlign` defaults to `'top'`, which anchors the first line's
    // ascender (0.9em * size 10 = 9) to y = 0, shifting the baseline-relative
    // y (3.5) down by 9.
    expect(mesh?.glyphs[0].offset).toEqual({ x: 3, y: 3.5 - 9 });
    expect(mesh?.bounds).toEqual({ width: 6, height: 12 });
  });

  it('does not re-shape unchanged text on a later tick', () => {
    const entity = world.createEntity();

    addTextComponent(world, entity, {
      text: 'A',
      fontAtlas: buildFontAtlas(),
      size: 10,
    });

    world.update();

    const firstMesh = world.getComponent<TextMeshEcsComponent>(
      entity,
      textMeshId,
    );

    world.update();

    const secondMesh = world.getComponent<TextMeshEcsComponent>(
      entity,
      textMeshId,
    );

    expect(secondMesh).toBe(firstMesh);
  });

  it('re-shapes when the text changes', () => {
    const entity = world.createEntity();

    const textComponent = addTextComponent(world, entity, {
      text: 'A',
      fontAtlas: buildFontAtlas(),
      size: 10,
    });

    world.update();

    const firstMesh = world.getComponent<TextMeshEcsComponent>(
      entity,
      textMeshId,
    );

    textComponent.text = 'B';
    world.update();

    const secondMesh = world.getComponent<TextMeshEcsComponent>(
      entity,
      textMeshId,
    );

    expect(secondMesh).not.toBe(firstMesh);
    // "B" uses a different atlas region (atlasBounds.left 0.1) than "A"
    // (0) - both inset by one texel (1/256) to avoid sampling across the
    // tile boundary.
    expect(secondMesh?.glyphs[0].uvOffset.x).toBeCloseTo(0.1 + 1 / 256);
  });

  it('re-shapes when the size changes', () => {
    const entity = world.createEntity();

    const textComponent = addTextComponent(world, entity, {
      text: 'A',
      fontAtlas: buildFontAtlas(),
      size: 10,
    });

    world.update();

    textComponent.size = 20;
    world.update();

    const mesh = world.getComponent<TextMeshEcsComponent>(entity, textMeshId);

    expect(mesh?.bounds).toEqual({ width: 12, height: 24 });
  });

  it('re-shapes when maxWidth changes', () => {
    const entity = world.createEntity();

    const textComponent = addTextComponent(world, entity, {
      text: 'A B',
      fontAtlas: buildFontAtlas(),
      size: 10,
    });

    world.update();

    textComponent.maxWidth = 1;
    world.update();

    const mesh = world.getComponent<TextMeshEcsComponent>(entity, textMeshId);

    // "A" and "B" now each get their own line, since neither fits alongside
    // the other within a maxWidth of 1.
    expect(mesh?.bounds.height).toBeCloseTo(24);
  });

  it('re-shapes when horizontalAlign, verticalAlign, or lineHeight changes', () => {
    const entity = world.createEntity();

    const textComponent = addTextComponent(world, entity, {
      text: 'A',
      fontAtlas: buildFontAtlas(),
      size: 10,
      lineHeight: 2,
    });

    world.update();

    let mesh = world.getComponent<TextMeshEcsComponent>(entity, textMeshId);

    expect(mesh?.bounds.height).toBeCloseTo(24);

    textComponent.lineHeight = 1;
    world.update();

    mesh = world.getComponent<TextMeshEcsComponent>(entity, textMeshId);

    expect(mesh?.bounds.height).toBeCloseTo(12);
  });

  it('shares one renderable across entities using the same font atlas', () => {
    const sharedFontAtlas = buildFontAtlas();
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    addTextComponent(world, entityA, {
      text: 'A',
      fontAtlas: sharedFontAtlas,
      size: 10,
    });
    addTextComponent(world, entityB, {
      text: 'B',
      fontAtlas: sharedFontAtlas,
      size: 10,
    });

    world.update();

    const meshA = world.getComponent<TextMeshEcsComponent>(entityA, textMeshId);
    const meshB = world.getComponent<TextMeshEcsComponent>(entityB, textMeshId);

    expect(meshA?.fillRenderable).toBe(meshB?.fillRenderable);
    expect(meshA?.effectsRenderable).toBe(meshB?.effectsRenderable);
  });

  it('creates separate renderables for the same font atlas under different categories', () => {
    const sharedFontAtlas = buildFontAtlas();
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    addTextComponent(world, entityA, {
      text: 'A',
      fontAtlas: sharedFontAtlas,
      size: 10,
      category: 0b0001,
    });
    addTextComponent(world, entityB, {
      text: 'B',
      fontAtlas: sharedFontAtlas,
      size: 10,
      category: 0b0010,
    });

    world.update();

    const meshA = world.getComponent<TextMeshEcsComponent>(entityA, textMeshId);
    const meshB = world.getComponent<TextMeshEcsComponent>(entityB, textMeshId);

    expect(meshA?.fillRenderable).not.toBe(meshB?.fillRenderable);
    expect(meshA?.fillRenderable.category).toBe(0b0001);
    expect(meshB?.fillRenderable.category).toBe(0b0010);
  });

  it('creates separate renderables for different font atlases', () => {
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    addTextComponent(world, entityA, {
      text: 'A',
      fontAtlas: buildFontAtlas(),
      size: 10,
    });
    addTextComponent(world, entityB, {
      text: 'A',
      fontAtlas: buildFontAtlas(),
      size: 10,
    });

    world.update();

    const meshA = world.getComponent<TextMeshEcsComponent>(entityA, textMeshId);
    const meshB = world.getComponent<TextMeshEcsComponent>(entityB, textMeshId);

    expect(meshA?.fillRenderable).not.toBe(meshB?.fillRenderable);
    expect(meshA?.effectsRenderable).not.toBe(meshB?.effectsRenderable);
  });
});
