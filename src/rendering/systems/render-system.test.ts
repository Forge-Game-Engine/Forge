/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createRenderEcsSystem } from './render-system';
import { EcsWorld } from '../../ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  PositionEcsComponent,
} from '../../common';
import { Vec2 } from '../../math';
import {
  addCameraComponent,
  addDrawOrderComponent,
  addMaskComponent,
  addVisibilityComponent,
  CameraEcsComponent,
  maxDrawOrder,
} from '../components';
import {
  addSpriteComponent,
  SpriteEcsComponent,
  spriteId,
} from '../components';
import { RenderContext } from '../render-context';
import { RenderTarget } from '../render-target';
import { Color } from '../color';
import type { SpriteMaterial } from '../materials/sprite-material';
import type { InstanceComponents } from '../renderable';
import type { Texture } from '../texture';
import type { InstanceMask } from '../utilities/resolve-instance-mask';
import { spriteInstanceDataSegment } from '../utilities/sprite-instance-data-segment';
import { ShaderCache } from '../shaders';
import { ImageCache } from '../../asset-loading';
import { createProjectionMatrix } from '../shaders';
import {
  addTextComponent,
  TextEcsComponent,
} from '../../text/components/text-component.js';
import {
  GlyphQuad,
  TextMeshEcsComponent,
  textMeshId,
} from '../../text/components/text-mesh-component.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';

// The text renderables draw with real instance layouts (so their glyphs go
// through `spriteInstanceDataSegment` like sprites do) and a stand-in
// material, since this suite's render context has no shaders.
vi.mock('../../text/rendering/create-text-renderables.js', async () => {
  const { Renderable } = await import('../renderable');
  const { combineInstanceDataSegments } =
    await import('../utilities/instance-data-segment');
  const { spriteInstanceDataSegment: spriteSegment } =
    await import('../utilities/sprite-instance-data-segment');
  const { textEmboldenInstanceDataSegment } =
    await import('../../text/rendering/text-embolden-instance-data-segment.js');
  const { textEffectsInstanceDataSegment } =
    await import('../../text/rendering/text-effects-instance-data-segment.js');

  const createRenderable = (
    ...segments: Parameters<typeof combineInstanceDataSegments>
  ): InstanceType<typeof Renderable> => {
    const layout = combineInstanceDataSegments(...segments);

    return new Renderable(
      { bind: vi.fn(), setUniform: vi.fn(), program: {} } as never,
      layout.floatsPerInstance,
      layout.bindInstanceData,
      layout.setupInstanceAttributes,
      vi.fn(),
    );
  };

  return {
    createTextRenderables: () => ({
      fillRenderable: createRenderable(
        spriteSegment,
        textEmboldenInstanceDataSegment,
      ),
      effectsRenderable: createRenderable(
        spriteSegment,
        textEmboldenInstanceDataSegment,
        textEffectsInstanceDataSegment,
      ),
    }),
  };
});

/** The floats `sprite.vert` reads per instance: the sprite data, its emissive color and its mask. */
const spriteFloatsPerInstance = 34;

describe('createRenderEcsSystem', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;

  const texture = {} as Texture;
  const bindInstanceDataByMaterial = new Map<SpriteMaterial | null, Mock>();
  let textMaterial: SpriteMaterial | null = null;

  /**
   * Creates a sprite material whose instances are recorded by their own
   * `bindInstanceData` mock (the sprite data each instance binds, in draw
   * order), standing in for the render system's renderable for it.
   */
  const createRenderable = (): {
    renderable: SpriteMaterial;
    material: SpriteMaterial;
    bindInstanceData: Mock;
  } => {
    const material = {
      bindSprites: vi.fn(),
      setUniform: vi.fn(),
      program: {} as WebGLProgram,
    } as unknown as SpriteMaterial;
    const bindInstanceData = vi.fn();

    bindInstanceDataByMaterial.set(material, bindInstanceData);

    return { renderable: material, material, bindInstanceData };
  };

  const createSprite = (
    material: SpriteMaterial,
    overrides: Partial<SpriteEcsComponent> = {},
  ): SpriteEcsComponent => ({
    width: 1,
    height: 1,
    pivot: Vec2.zero,
    tintColor: new Color(1, 1, 1, 1),
    texture,
    emissive: null,
    material,
    category: 1,
    uvOffset: Vec2.zero,
    uvScale: Vec2.zero,
    layer: 0,
    ...overrides,
  });

  const addCameraEntity = (
    cullingMask: number = 0xffffffff,
    renderTarget?: CameraEcsComponent['renderTarget'],
  ): CameraEcsComponent => {
    const entity = world.createEntity();
    const camera = addCameraComponent(world, entity, {
      minZoom: 0.0001,
      maxZoom: 10000,
      isStatic: true,
      cullingMask,
      renderTarget,
      // Wide enough that tests about anything other than view culling
      // never place a sprite outside the view.
      verticalWorldUnits: 10000,
    });

    addPositionComponent(world, entity);

    return camera;
  };

  const addSpriteEntity = (
    renderable: SpriteMaterial,
    worldY: number,
    overrides: Partial<SpriteEcsComponent> = {},
  ): number => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      local: { x: 0, y: worldY },
    });
    addSpriteComponent(world, entity, createSprite(renderable, overrides));

    return entity;
  };

  /**
   * Adds a text entity whose glyphs are recorded by `renderable`'s
   * `bindInstanceData` mock.
   */
  const addTextEntity = (
    renderable: SpriteMaterial,
    worldY: number,
    mesh: Partial<TextMeshEcsComponent> = {},
    textOverrides: Partial<TextEcsComponent> = {},
  ): number => {
    const entity = world.createEntity();

    textMaterial = renderable;
    addPositionComponent(world, entity, {
      local: { x: 0, y: worldY },
    });

    addTextComponent(world, entity, {
      text: 'A',
      fontAtlas: { texture } as FontAtlas,
      size: 10,
      ...textOverrides,
    });

    world.addComponent<TextMeshEcsComponent>(entity, textMeshId, {
      glyphs: [],
      bounds: { width: 0, height: 0 },
      caretStops: [],
      ...mesh,
    });

    return entity;
  };

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    mockGl = {
      createBuffer: vi.fn().mockReturnValue({}),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      createVertexArray: vi.fn().mockReturnValue({}),
      bindVertexArray: vi.fn(),
      getAttribLocation: vi.fn().mockReturnValue(0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      vertexAttribDivisor: vi.fn(),
      createTexture: vi.fn().mockReturnValue({}),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      blendFunc: vi.fn(),
      blendFuncSeparate: vi.fn(),
      drawArraysInstanced: vi.fn(),
      viewport: vi.fn(),
      bindFramebuffer: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      STATIC_DRAW: 'STATIC_DRAW',
      DYNAMIC_DRAW: 'DYNAMIC_DRAW',
      FRAMEBUFFER: 'FRAMEBUFFER',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
      BLEND: 'BLEND',
      ONE: 'ONE',
      SRC_ALPHA: 'SRC_ALPHA',
      ONE_MINUS_SRC_ALPHA: 'ONE_MINUS_SRC_ALPHA',
      getExtension: vi.fn(() => null),
      isContextLost: vi.fn(() => false),
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    bindInstanceDataByMaterial.clear();
    textMaterial = null;
    vi.spyOn(spriteInstanceDataSegment, 'bindInstanceData').mockImplementation(
      (components, buffer, offset) => {
        const route = components.sprite.material ?? textMaterial;

        bindInstanceDataByMaterial.get(route)?.(components, buffer, offset);
      },
    );

    renderContext = new RenderContext(
      new ShaderCache([]),
      new ImageCache(),
      canvas,
    );
    world = new EcsWorld();
    world.addSystem(createRenderEcsSystem(renderContext));
  });

  it('does not draw anything when there is no camera entity', () => {
    const { renderable } = createRenderable();

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('does not draw anything when there are no sprite entities', () => {
    addCameraEntity();

    world.update();

    expect(mockGl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('skips sprites hidden by their own visibility', () => {
    addCameraEntity();
    const { renderable, bindInstanceData } = createRenderable();

    const entity = addSpriteEntity(renderable, 0);
    addVisibilityComponent(world, entity, { visible: false });

    world.update();

    expect(bindInstanceData).not.toHaveBeenCalled();
    expect(mockGl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it("skips sprites and text under a hidden ancestor, and draws them again once it's shown", () => {
    addCameraEntity();
    const { renderable, bindInstanceData } = createRenderable();

    const root = world.createEntity();
    const visibility = addVisibilityComponent(world, root, { visible: false });
    const middle = world.createEntity();
    world.setParent(middle, root);
    const sprite = addSpriteEntity(renderable, 0);
    world.setParent(sprite, middle);
    const text = addTextEntity(renderable, 0, {
      glyphs: [
        {
          offset: Vec2.zero,
          size: { x: 1, y: 1 },
          uvOffset: Vec2.zero,
          uvScale: Vec2.one,
          embolden: 0,
        },
      ],
    });
    world.setParent(text, middle);

    world.update();

    expect(bindInstanceData).not.toHaveBeenCalled();

    visibility.visible = true;
    world.update();

    expect(bindInstanceData).toHaveBeenCalledTimes(2);
  });

  it('draws a visible sibling of a hidden entity', () => {
    addCameraEntity();
    const { renderable, bindInstanceData } = createRenderable();

    const parent = world.createEntity();
    const hidden = addSpriteEntity(renderable, 0);
    const shown = addSpriteEntity(renderable, 0);
    world.setParent(hidden, parent);
    world.setParent(shown, parent);
    addVisibilityComponent(world, hidden, { visible: false });

    world.update();

    expect(bindInstanceData).toHaveBeenCalledTimes(1);
  });

  it('skips sprites whose category does not match the camera culling mask', () => {
    addCameraEntity(0b0010);
    const { renderable, bindInstanceData } = createRenderable();

    addSpriteEntity(renderable, 0, { category: 0b0001 });

    world.update();

    expect(bindInstanceData).not.toHaveBeenCalled();
    expect(mockGl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('draws sprites whose category matches the camera culling mask', () => {
    addCameraEntity(0b0011);
    const { renderable, bindInstanceData } = createRenderable();

    addSpriteEntity(renderable, 0, { category: 0b0001 });

    world.update();

    expect(bindInstanceData).toHaveBeenCalledTimes(1);
    expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(1);
  });

  it('draws nothing while the WebGL context is lost', () => {
    addCameraEntity(0b0011);
    const { renderable, bindInstanceData } = createRenderable();

    addSpriteEntity(renderable, 0, { category: 0b0001 });
    (mockGl.isContextLost as Mock).mockReturnValue(true);

    world.update();

    expect(bindInstanceData).not.toHaveBeenCalled();
    expect(mockGl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('uses the render context dimensions (not the canvas dimensions) for the projection matrix', () => {
    addCameraEntity();
    const { renderable, material } = createRenderable();

    addSpriteEntity(renderable, 0);

    renderContext.resize(400, 200);
    // Change the canvas' own dimensions to confirm they are no longer read directly.
    canvas.width = 999;
    canvas.height = 999;

    world.update();

    const expected = createProjectionMatrix({
      min: { x: -10000, y: -5000 },
      max: { x: 10000, y: 5000 },
    });

    expect(material.setUniform).toHaveBeenCalledWith('u_projection', expected);
  });

  it("projects the camera's verticalWorldUnits over the canvas's height", () => {
    const entity = world.createEntity();

    addCameraComponent(world, entity, {
      minZoom: 0.0001,
      maxZoom: 10000,
      isStatic: true,
      verticalWorldUnits: 20,
    });
    addPositionComponent(world, entity);

    const { renderable, material } = createRenderable();

    addSpriteEntity(renderable, 0);

    renderContext.resize(400, 200);
    world.update();

    const expected = createProjectionMatrix({
      min: { x: -20, y: -10 },
      max: { x: 20, y: 10 },
    });

    expect(material.setUniform).toHaveBeenCalledWith('u_projection', expected);
  });

  it('batches consecutive sprites that share a material and texture into a single draw call', () => {
    addCameraEntity();
    const { renderable, bindInstanceData } = createRenderable();

    addSpriteEntity(renderable, 0);
    addSpriteEntity(renderable, 1);

    world.update();

    expect(bindInstanceData).toHaveBeenCalledTimes(2);
    expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(1);
    expect(mockGl.drawArraysInstanced).toHaveBeenCalledWith(undefined, 0, 6, 2);
    // One instance upload; the quad's own vertex buffers are static.
    expect(
      (mockGl.bufferData as Mock).mock.calls.filter(
        ([, , usage]) => usage === 'DYNAMIC_DRAW',
      ),
    ).toHaveLength(1);

    const bindOffsets = bindInstanceData.mock.calls.map(
      (call) => call[2] as number,
    );

    expect(bindOffsets).toEqual([0, spriteFloatsPerInstance]);
  });

  describe('draw order', () => {
    // pivot.x is only used here as a per-sprite identity tag: it doesn't
    // affect the order, and (unlike tintColor) isn't clamped.
    const addTaggedSprite = (
      renderable: SpriteMaterial,
      id: number,
      worldY: number = 0,
      overrides: Partial<SpriteEcsComponent> = {},
    ): number =>
      addSpriteEntity(renderable, worldY, {
        pivot: { x: id, y: 0 },
        ...overrides,
      });

    const drawnIds = (bindInstanceData: Mock): number[] =>
      bindInstanceData.mock.calls.map(
        (call) => (call[0] as { sprite: SpriteEcsComponent }).sprite.pivot.x,
      );

    const addYSortCamera = (): void => {
      const entity = world.createEntity();

      addCameraComponent(world, entity, {
        isStatic: true,
        verticalWorldUnits: 1e7,
        ySort: true,
      });
      addPositionComponent(world, entity);
    };

    it('draws root sprites in creation order, whatever their world Y', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      addTaggedSprite(renderable, 0, 10);
      addTaggedSprite(renderable, 1, -5);
      addTaggedSprite(renderable, 2, 2);

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 2]);
    });

    it("sorts by the sprite's layer first", () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      addTaggedSprite(renderable, 0, 0, { layer: 1 });
      addTaggedSprite(renderable, 1, 0, { layer: -1 });
      addTaggedSprite(renderable, 2);

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([1, 2, 0]);
    });

    it('draws children after their parent, in sibling order, before the next root', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      const secondChild = addTaggedSprite(renderable, 2);
      const parent = addTaggedSprite(renderable, 0);
      const firstChild = addTaggedSprite(renderable, 1);

      addTaggedSprite(renderable, 3);
      world.setParent(firstChild, parent);
      world.setParent(secondChild, parent);

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 2, 3]);
    });

    it('draws a child with order -1 behind every entity at its parent level, with no per-frame code', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      addTaggedSprite(renderable, 1);
      const ship = addTaggedSprite(renderable, 2);
      const flame = addTaggedSprite(renderable, 0);

      world.setParent(flame, ship);
      addDrawOrderComponent(world, flame, { order: -1 });

      world.update();
      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 2, 0, 1, 2]);
    });

    it('draws a behindParent child just behind its parent, in front of what its parent is in front of', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      addTaggedSprite(renderable, 0);
      const ship = addTaggedSprite(renderable, 2);
      const flame = addTaggedSprite(renderable, 1);

      addTaggedSprite(renderable, 4);
      world.setParent(flame, ship);
      addDrawOrderComponent(world, flame, { behindParent: true });

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 2, 4]);
    });

    it('keeps a behindParent subtree together, and behindParent siblings in sibling order, around the other children', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      const parent = addTaggedSprite(renderable, 3);
      const front = addTaggedSprite(renderable, 4);
      const firstBehind = addTaggedSprite(renderable, 0);
      const firstBehindChild = addTaggedSprite(renderable, 1);
      const secondBehind = addTaggedSprite(renderable, 2);

      world.setParent(front, parent);
      world.setParent(firstBehind, parent);
      world.setParent(secondBehind, parent);
      world.setParent(firstBehindChild, firstBehind);
      addDrawOrderComponent(world, firstBehind, { behindParent: true });
      addDrawOrderComponent(world, secondBehind, { behindParent: true });

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 2, 3, 4]);
    });

    it('composes orders through two levels and through a container without a sprite', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      const container = world.createEntity();
      const parent = addTaggedSprite(renderable, 2);
      const child = addTaggedSprite(renderable, 1);

      addTaggedSprite(renderable, 3, 0, { layer: 0 });
      addTaggedSprite(renderable, 0);
      world.setParent(parent, container);
      world.setParent(child, parent);
      // 2 + -1 = 1: the child sorts between the order-0 sprites and its
      // order-2 parent.
      addDrawOrderComponent(world, container, { order: 2 });
      addDrawOrderComponent(world, child, { order: -1 });

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([3, 0, 1, 2]);
    });

    it('keeps root order by creation when other entities are removed and their slots reused', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      const removed = addTaggedSprite(renderable, 9);

      addTaggedSprite(renderable, 0);
      addTaggedSprite(renderable, 1);
      world.removeEntity(removed);
      // Reuses the removed entity's slot, but was created last.
      addTaggedSprite(renderable, 2);

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 2]);
    });

    it('puts an unparented entity back among the roots at its own creation', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      const child = addTaggedSprite(renderable, 0);
      const middle = addTaggedSprite(renderable, 1);
      const parent = addTaggedSprite(renderable, 2);

      world.setParent(child, parent);
      world.removeParent(child);
      world.setParent(middle, parent);
      world.removeParent(middle);

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 2]);
    });

    it('throws when adding a draw order that is not an integer in range', () => {
      const entity = world.createEntity();

      expect(() =>
        addDrawOrderComponent(world, entity, { order: 0.5 }),
      ).toThrow();
      expect(() =>
        addDrawOrderComponent(world, entity, { order: maxDrawOrder + 1 }),
      ).toThrow();
      expect(() =>
        addDrawOrderComponent(world, entity, { order: -maxDrawOrder }),
      ).not.toThrow();
    });

    it('y-sorts for a camera with ySort: lower on screen draws in front', () => {
      addYSortCamera();
      const { renderable, bindInstanceData } = createRenderable();

      addTaggedSprite(renderable, 2, -5);
      addTaggedSprite(renderable, 0, 10);
      addTaggedSprite(renderable, 1, 2);

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 2]);
    });

    it("y-sorts a subtree by its root's Y, so it moves as one", () => {
      addYSortCamera();
      const { renderable, bindInstanceData } = createRenderable();

      const character = addTaggedSprite(renderable, 0, 5);
      // Far below everything, but it belongs to the character.
      const sword = addTaggedSprite(renderable, 1, -100);

      addTaggedSprite(renderable, 2, 0);
      world.setParent(sword, character);

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 2]);
    });

    it('y-sorts a subtree under a root without a position as Y = 0', () => {
      addYSortCamera();
      const { renderable, bindInstanceData } = createRenderable();

      addTaggedSprite(renderable, 2, -1);
      const container = world.createEntity();
      const child = addTaggedSprite(renderable, 1, -50);

      addTaggedSprite(renderable, 0, 1);
      world.setParent(child, container);

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 2]);
    });

    it('y-sorts exactly, however wide the range of Y in the frame', () => {
      addYSortCamera();
      const { renderable, bindInstanceData } = createRenderable();

      addTaggedSprite(renderable, 3, 0);
      addTaggedSprite(renderable, 4, -1e6);
      addTaggedSprite(renderable, 2, 1e-3);
      addTaggedSprite(renderable, 0, 1e6);
      addTaggedSprite(renderable, 1, 2e-3);

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 2, 3, 4]);
    });

    it('only y-sorts for the cameras that ask for it', () => {
      addCameraEntity();
      addYSortCamera();
      const { renderable, bindInstanceData } = createRenderable();

      addTaggedSprite(renderable, 0, -5);
      addTaggedSprite(renderable, 1, 5);

      world.update();

      expect(drawnIds(bindInstanceData)).toEqual([0, 1, 1, 0]);
    });

    it('orders many sprites the same way a full comparison sort would', () => {
      addYSortCamera();
      const { renderable, bindInstanceData } = createRenderable();

      const layers = [-2, 0, 1, 5];
      // Deterministic pseudo-random layers, orders and Ys, with plenty of
      // ties to exercise every part of the key.
      const sprites = Array.from({ length: 733 }, (_, i) => ({
        id: i,
        layer: layers[i % layers.length],
        order: Math.floor(Math.sin(i * 7.31) * 3),
        y: Math.floor(Math.sin(i * 12.9898) * 50),
      }));

      for (const sprite of sprites) {
        const entity = addTaggedSprite(renderable, sprite.id, sprite.y, {
          layer: sprite.layer,
        });

        addDrawOrderComponent(world, entity, { order: sprite.order });
      }

      world.update();

      const expected = sprites
        .slice()
        .sort(
          (a, b) =>
            a.layer - b.layer || a.order - b.order || b.y - a.y || a.id - b.id,
        )
        .map((sprite) => sprite.id);

      expect(drawnIds(bindInstanceData)).toEqual(expected);
    });
  });

  it('blends color as straight alpha but accumulates alpha with ONE, so destinations store premultiplied alpha', () => {
    addCameraEntity();
    const { renderable } = createRenderable();

    addSpriteEntity(renderable, 0);

    world.update();

    // Reusing the color factors for alpha (`blendFunc(SRC_ALPHA,
    // ONE_MINUS_SRC_ALPHA)`) would store `a * a` in the destination, which
    // the present pass then multiplies in a second time.
    expect(mockGl.enable).toHaveBeenCalledWith(mockGl.BLEND);
    expect(mockGl.blendFuncSeparate).toHaveBeenCalledWith(
      mockGl.SRC_ALPHA,
      mockGl.ONE_MINUS_SRC_ALPHA,
      mockGl.ONE,
      mockGl.ONE_MINUS_SRC_ALPHA,
    );
    expect(mockGl.blendFunc).not.toHaveBeenCalled();
  });

  it('disables blending after drawing a camera', () => {
    addCameraEntity();
    const { renderable } = createRenderable();

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
  });

  it('splits into separate draw calls when sprites with different materials interleave by depth', () => {
    addCameraEntity();
    const a = createRenderable();
    const b = createRenderable();

    addSpriteEntity(a.renderable, 0);
    addSpriteEntity(b.renderable, 1);
    addSpriteEntity(a.renderable, 2);

    world.update();

    expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(3);
    expect(mockGl.drawArraysInstanced).toHaveBeenNthCalledWith(
      1,
      undefined,
      0,
      6,
      1,
    );
    expect(mockGl.drawArraysInstanced).toHaveBeenNthCalledWith(
      2,
      undefined,
      0,
      6,
      1,
    );
    expect(mockGl.drawArraysInstanced).toHaveBeenNthCalledWith(
      3,
      undefined,
      0,
      6,
      1,
    );
    expect(a.bindInstanceData).toHaveBeenCalledTimes(2);
    expect(b.bindInstanceData).toHaveBeenCalledTimes(1);
  });

  it('splits batches where the texture or the emissive map changes', () => {
    addCameraEntity();
    const { renderable, material } = createRenderable();
    const otherTexture = {} as Texture;
    const emissive = { texture: {} as Texture, color: new Color(2, 2, 2) };

    addSpriteEntity(renderable, 0);
    addSpriteEntity(renderable, 1, { texture: otherTexture });
    addSpriteEntity(renderable, 2, { texture: otherTexture, emissive });
    addSpriteEntity(renderable, 3, { texture: otherTexture, emissive });

    world.update();

    expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(3);
    expect((material.bindSprites as Mock).mock.calls).toEqual([
      [mockGl, texture, renderContext.blackTexture],
      [mockGl, otherTexture, renderContext.blackTexture],
      [mockGl, otherTexture, emissive.texture],
    ]);
  });

  it("draws a sprite's new texture once its texture is changed", () => {
    addCameraEntity();
    const { renderable, material } = createRenderable();
    const entity = addSpriteEntity(renderable, 0);
    const otherTexture = {} as Texture;

    world.update();
    world.getComponentRequired(entity, spriteId).texture = otherTexture;
    world.update();

    expect((material.bindSprites as Mock).mock.calls[1][1]).toBe(otherTexture);
  });

  it("draws a sprite without a material with the render context's sprite material", () => {
    addCameraEntity();
    const { material, bindInstanceData } = createRenderable();

    Object.defineProperty(renderContext, 'spriteMaterial', { value: material });
    addSpriteEntity(material, 0, { material: null });

    world.update();

    expect(material.bindSprites).toHaveBeenCalledTimes(1);
    expect(bindInstanceData).not.toHaveBeenCalled();
  });

  it('draws once per camera entity, using each camera projection', () => {
    addCameraEntity();
    addCameraEntity();
    const { renderable, bindInstanceData } = createRenderable();

    addSpriteEntity(renderable, 0);

    world.update();

    expect(bindInstanceData).toHaveBeenCalledTimes(2);
    expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(2);
  });

  it('binds the default framebuffer and clears before drawing a camera with no render target', () => {
    addCameraEntity();
    const { renderable } = createRenderable();

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenCalledWith(
      mockGl.FRAMEBUFFER,
      null,
    );
    expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
  });

  it("binds the camera's render target framebuffer and clears before drawing", () => {
    const target = {
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as unknown as RenderTarget;

    addCameraEntity(0xffffffff, target);
    const { renderable } = createRenderable();

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.bindFramebuffer).toHaveBeenCalledWith(
      mockGl.FRAMEBUFFER,
      target.framebuffer,
    );
    expect(mockGl.viewport).toHaveBeenCalledWith(0, 0, 128, 128);
    expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
  });

  it('clears the canvas only once when multiple cameras share it', () => {
    addCameraEntity();
    addCameraEntity();
    const { renderable } = createRenderable();

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.clear).toHaveBeenCalledTimes(1);
  });

  it('clears each distinct render target once when cameras target different buffers', () => {
    const targetA = {
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as unknown as RenderTarget;
    const targetB = {
      framebuffer: {} as WebGLFramebuffer,
      width: 64,
      height: 64,
    } as unknown as RenderTarget;

    addCameraEntity(0xffffffff, targetA);
    addCameraEntity(0xffffffff, targetB);
    const { renderable } = createRenderable();

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.clear).toHaveBeenCalledTimes(2);
  });

  it('clears a render target only once when multiple cameras share it', () => {
    const sharedTarget = {
      framebuffer: {} as WebGLFramebuffer,
      width: 128,
      height: 128,
    } as unknown as RenderTarget;

    addCameraEntity(0xffffffff, sharedTarget);
    addCameraEntity(0xffffffff, sharedTarget);
    const { renderable } = createRenderable();

    addSpriteEntity(renderable, 0);

    world.update();

    expect(mockGl.clear).toHaveBeenCalledTimes(1);
  });

  it('clears again on the next frame', () => {
    addCameraEntity();
    const { renderable } = createRenderable();

    addSpriteEntity(renderable, 0);

    world.update();
    world.update();

    expect(mockGl.clear).toHaveBeenCalledTimes(2);
  });

  describe('nine-slice sprites', () => {
    it('draws a sliced sprite as nine batched instances of the same renderable', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      addSpriteEntity(renderable, 0, {
        width: 100,
        height: 100,
        pivot: { x: 0.5, y: 0.5 },
        slices: { left: 10, right: 10, top: 10, bottom: 10 },
      });

      world.update();

      expect(bindInstanceData).toHaveBeenCalledTimes(9);
      // All nine regions share the same renderable, so they still batch
      // into a single draw call.
      expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(1);
      expect(mockGl.drawArraysInstanced).toHaveBeenCalledWith(
        undefined,
        0,
        6,
        9,
      );
    });

    it('positions each region around the entity, accounting for rotation', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      const entity = world.createEntity();

      addPositionComponent(world, entity, {
        local: { x: 50, y: 0 },
      });
      addRotationComponent(world, entity, { local: Math.PI });
      addSpriteComponent(
        world,
        entity,
        createSprite(renderable, {
          width: 100,
          height: 100,
          pivot: { x: 0.5, y: 0.5 },
          slices: { left: 10, right: 10, top: 10, bottom: 10 },
        }),
      );

      world.update();

      const positions = bindInstanceData.mock.calls.map(
        (call) => (call[0] as { position: PositionEcsComponent }).position,
      );

      // The top-left corner (offset (-45, 45) before rotation) rotates 180
      // degrees around the entity, landing on the opposite side.
      const rotatedCorner = positions.find(
        (position) =>
          Math.abs(position.world.x - (50 + 45)) < 1e-9 &&
          Math.abs(position.world.y - -45) < 1e-9,
      );

      expect(rotatedCorner).toBeDefined();
    });

    it('orbits regions around the entity in the same screen direction the shader spins their own quad', () => {
      // A 180 degree rotation can't tell an orbit direction bug apart from
      // correct behavior (rotating by +90 or -90 degrees lands in the same
      // place), so this uses a 90 degree rotation, whose two possible
      // landing spots are distinct.
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      const entity = world.createEntity();

      addPositionComponent(world, entity, {
        local: { x: 50, y: 0 },
      });
      addRotationComponent(world, entity, { local: Math.PI / 2 });
      addSpriteComponent(
        world,
        entity,
        createSprite(renderable, {
          width: 100,
          height: 100,
          pivot: { x: 0.5, y: 0.5 },
          slices: { left: 10, right: 10, top: 10, bottom: 10 },
        }),
      );

      world.update();

      const positions = bindInstanceData.mock.calls.map(
        (call) => (call[0] as { position: PositionEcsComponent }).position,
      );

      // The top-left corner (offset (-45, 45) before rotation) orbits to
      // (-45, -45): the same direction `Vec2.rotate` (and the shader's
      // own rotation of the region's quad) turns the entity's true world
      // rotation. Orbiting it the other way around the entity (a sign bug)
      // would instead land it at (45, 45), tearing the sliced sprite's
      // regions apart on rotation.
      const rotatedCorner = positions.find(
        (position) =>
          Math.abs(position.world.x - (50 - 45)) < 1e-9 &&
          Math.abs(position.world.y - -45) < 1e-9,
      );

      expect(rotatedCorner).toBeDefined();
    });

    it('keeps sampling the same border art after a sliced sprite is resized', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      // A 24x24 sprite with 8-unit borders, the way a layout system would
      // receive it before resizing it to its laid-out rect every frame.
      const entity = addSpriteEntity(renderable, 0, {
        width: 24,
        height: 24,
        pivot: { x: 0.5, y: 0.5 },
        uvScale: { x: 1, y: 1 },
        slices: { left: 8, right: 8, top: 8, bottom: 8 },
      });

      const sprite = world.getComponentRequired(entity, spriteId);
      sprite.width = 178;
      sprite.height = 80;

      world.update();

      const regionSprites = bindInstanceData.mock.calls.map(
        (call) => (call[0] as { sprite: SpriteEcsComponent }).sprite,
      );
      const corners = regionSprites.filter(
        (regionSprite) => regionSprite.width === 8 && regionSprite.height === 8,
      );

      // Each corner still samples 8/24 of the texture, not 8/178 x 8/80 of
      // it (a texel or two smeared across the whole corner).
      expect(corners).toHaveLength(4);

      for (const corner of corners) {
        expect(corner.uvScale.x).toBeCloseTo(8 / 24);
        expect(corner.uvScale.y).toBeCloseTo(8 / 24);
      }
    });

    it('does not slice a sprite with no `slices` configured', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      addSpriteEntity(renderable, 0, { width: 100, height: 100 });

      world.update();

      expect(bindInstanceData).toHaveBeenCalledTimes(1);
    });
  });

  describe('text', () => {
    it('draws one batched instance per glyph in the text mesh', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      addTextEntity(renderable, 0, {
        glyphs: [
          {
            offset: { x: 0, y: 0 },
            size: { x: 1, y: 1 },
            uvOffset: { x: 0, y: 0 },
            uvScale: { x: 0.1, y: 0.1 },
            embolden: 0,
          },
          {
            offset: { x: 1, y: 0 },
            size: { x: 1, y: 1 },
            uvOffset: { x: 0.1, y: 0 },
            uvScale: { x: 0.1, y: 0.1 },
            embolden: 0,
          },
        ],
      });

      world.update();

      expect(bindInstanceData).toHaveBeenCalledTimes(2);
      // Both glyphs come from the same font atlas, so they batch into a
      // single draw call.
      expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(1);
      expect(mockGl.drawArraysInstanced).toHaveBeenCalledWith(
        undefined,
        0,
        6,
        2,
      );
    });

    // Glyph positioning and tint are unit-tested directly against
    // `pushTextRenderCommands` in `src/text/rendering/glyph-quad.test.ts`.

    const glyph = {
      offset: Vec2.zero,
      size: { x: 1, y: 1 },
      uvOffset: Vec2.zero,
      uvScale: Vec2.one,
      embolden: 0,
    };

    it('skips hidden text', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      const entity = addTextEntity(renderable, 0, { glyphs: [glyph] });
      addVisibilityComponent(world, entity, { visible: false });

      world.update();

      expect(bindInstanceData).not.toHaveBeenCalled();
    });

    it("skips text whose category doesn't match the camera's culling mask", () => {
      addCameraEntity(0b0010);
      const { renderable, bindInstanceData } = createRenderable();

      addTextEntity(renderable, 0, { glyphs: [glyph] }, { category: 0b0001 });

      world.update();

      expect(bindInstanceData).not.toHaveBeenCalled();
    });

    it("draws text with its entity's rotation and scale", () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();
      const entity = addTextEntity(renderable, 0, { glyphs: [glyph] });
      const rotation = addRotationComponent(world, entity, { local: 1.5 });
      const scale = addScaleComponent(world, entity, {
        local: { x: 2, y: 2 },
      });

      world.update();

      expect(bindInstanceData.mock.calls[0][0]).toMatchObject({
        rotation,
        scale,
      });
    });

    it("draws an entity's sprite before its text", () => {
      addCameraEntity();
      const sprite = createRenderable();
      const text = createRenderable();
      const entity = addTextEntity(text.renderable, 0, { glyphs: [glyph] });

      addSpriteComponent(world, entity, createSprite(sprite.renderable));

      world.update();

      expect(sprite.bindInstanceData.mock.invocationCallOrder[0]).toBeLessThan(
        text.bindInstanceData.mock.invocationCallOrder[0],
      );
    });

    it('draws text and sprites in separate batches, even with the same texture', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      addSpriteEntity(renderable, 0);
      addTextEntity(renderable, 1, {
        glyphs: [
          {
            offset: Vec2.zero,
            size: { x: 1, y: 1 },
            uvOffset: Vec2.zero,
            uvScale: Vec2.one,
            embolden: 0,
          },
        ],
      });

      world.update();

      expect(bindInstanceData).toHaveBeenCalledTimes(2);
      expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(2);
    });
  });

  describe('view culling', () => {
    // An 800x600 canvas and a camera at the origin showing 10 world units
    // vertically: the view spans x in [-6.67, 6.67] and y in [-5, 5].
    const addNarrowCamera = (): void => {
      const entity = world.createEntity();

      addCameraComponent(world, entity, {
        isStatic: true,
        verticalWorldUnits: 10,
      });
      addPositionComponent(world, entity);
    };

    const addSpriteAt = (
      renderable: SpriteMaterial,
      position: { x: number; y: number },
      overrides: Partial<SpriteEcsComponent> = {},
    ): number => {
      const entity = world.createEntity();

      addPositionComponent(world, entity, { local: position });
      addSpriteComponent(
        world,
        entity,
        createSprite(renderable, { pivot: { x: 0.5, y: 0.5 }, ...overrides }),
      );

      return entity;
    };

    const drawnSprites = (bindInstanceData: Mock): SpriteEcsComponent[] =>
      bindInstanceData.mock.calls.map(
        (call) => (call[0] as { sprite: SpriteEcsComponent }).sprite,
      );

    it('skips a sprite just outside the top edge', () => {
      addNarrowCamera();
      const { renderable, bindInstanceData } = createRenderable();

      addSpriteAt(renderable, { x: 0, y: 5.51 });

      world.update();

      expect(bindInstanceData).not.toHaveBeenCalled();
      expect(mockGl.drawArraysInstanced).not.toHaveBeenCalled();
    });

    it('draws a sprite overlapping the top edge by a sliver', () => {
      addNarrowCamera();
      const { renderable, bindInstanceData } = createRenderable();

      addSpriteAt(renderable, { x: 0, y: 5.49 });

      world.update();

      expect(bindInstanceData).toHaveBeenCalledTimes(1);
    });

    it('skips only the sprites outside the view, keeping the rest in draw order', () => {
      addNarrowCamera();
      const { renderable, bindInstanceData } = createRenderable();

      addSpriteAt(renderable, { x: 0, y: 2 }, { uvOffset: { x: 2, y: 0 } });
      addSpriteAt(renderable, { x: -20, y: 0 }, { uvOffset: { x: 0, y: 0 } });
      addSpriteAt(renderable, { x: 0, y: -2 }, { uvOffset: { x: 1, y: 0 } });
      addSpriteAt(renderable, { x: 0, y: -20 }, { uvOffset: { x: 3, y: 0 } });

      world.update();

      expect(
        drawnSprites(bindInstanceData).map((sprite) => sprite.uvOffset.x),
      ).toEqual([2, 1]);
    });

    it("respects the sprite's rotation", () => {
      addNarrowCamera();
      const { renderable, bindInstanceData } = createRenderable();

      // A 4x0.2 bar centered at x = 8 reaches x = 6 lying flat, inside the
      // view, but only x = 7.9 standing upright.
      addSpriteAt(renderable, { x: 8, y: 0 }, { width: 4, height: 0.2 });
      const upright = addSpriteAt(
        renderable,
        { x: 8, y: 0 },
        { width: 4, height: 0.2, uvOffset: { x: 1, y: 0 } },
      );

      addRotationComponent(world, upright, { local: Math.PI / 2 });

      world.update();

      expect(
        drawnSprites(bindInstanceData).map((sprite) => sprite.uvOffset.x),
      ).toEqual([0]);
    });

    it("respects the sprite's scale", () => {
      addNarrowCamera();
      const { renderable, bindInstanceData } = createRenderable();

      addSpriteAt(renderable, { x: 7.5, y: 0 });
      const scaled = addSpriteAt(
        renderable,
        { x: 7.5, y: 0 },
        { uvOffset: { x: 1, y: 0 } },
      );

      addScaleComponent(world, scaled, { local: { x: 4, y: 4 } });

      world.update();

      expect(
        drawnSprites(bindInstanceData).map((sprite) => sprite.uvOffset.x),
      ).toEqual([1]);
    });

    it('culls against a moved, zoomed camera', () => {
      const camera = world.createEntity();

      addCameraComponent(world, camera, {
        isStatic: true,
        verticalWorldUnits: 10,
        zoom: 2,
      });
      addPositionComponent(world, camera, { local: { x: 100, y: 0 } });

      const { renderable, bindInstanceData } = createRenderable();

      // The view spans x in [96.67, 103.33] and y in [-2.5, 2.5].
      addSpriteAt(renderable, { x: 0, y: 0 });
      addSpriteAt(renderable, { x: 100, y: 3.1 });
      addSpriteAt(renderable, { x: 103.5, y: 0 }, { uvOffset: { x: 1, y: 0 } });

      world.update();

      expect(
        drawnSprites(bindInstanceData).map((sprite) => sprite.uvOffset.x),
      ).toEqual([1]);
    });

    it('culls each camera against its own view', () => {
      addNarrowCamera();
      const farCamera = world.createEntity();

      addCameraComponent(world, farCamera, {
        isStatic: true,
        verticalWorldUnits: 10,
      });
      addPositionComponent(world, farCamera, { local: { x: 50, y: 0 } });

      const { renderable, bindInstanceData } = createRenderable();

      addSpriteAt(renderable, { x: 0, y: 0 });
      addSpriteAt(renderable, { x: 50, y: 0 });

      world.update();

      expect(bindInstanceData).toHaveBeenCalledTimes(2);
      expect(mockGl.drawArraysInstanced).toHaveBeenCalledTimes(2);
    });

    it('draws only the nine-slice regions inside the view', () => {
      addNarrowCamera();
      const { renderable, bindInstanceData } = createRenderable();

      // Spans x in [6, 16]: only its 1-unit-wide left column reaches into
      // the view.
      addSpriteAt(
        renderable,
        { x: 11, y: 0 },
        {
          width: 10,
          height: 6,
          slices: { left: 1, right: 1, top: 1, bottom: 1 },
        },
      );

      world.update();

      expect(bindInstanceData).toHaveBeenCalledTimes(3);
      expect(
        drawnSprites(bindInstanceData).every((sprite) => sprite.width === 1),
      ).toBe(true);
    });

    it('draws only the glyphs of a text inside the view', () => {
      addNarrowCamera();
      const { renderable, bindInstanceData } = createRenderable();
      const glyph = (x: number): GlyphQuad => ({
        offset: { x, y: 0 },
        size: { x: 1, y: 1 },
        uvOffset: Vec2.zero,
        uvScale: Vec2.one,
        embolden: 0,
      });

      addTextEntity(renderable, 0, {
        glyphs: [glyph(5), glyph(6.5), glyph(7.5)],
      });

      world.update();

      expect(
        bindInstanceData.mock.calls.map(
          (call) =>
            (call[0] as { position: PositionEcsComponent }).position.world.x,
        ),
      ).toEqual([5, 6.5]);
    });

    it("draws an off-screen text's outline and shadow with its visible glyphs", () => {
      addNarrowCamera();
      const { renderable, bindInstanceData } = createRenderable();

      addTextEntity(
        renderable,
        0,
        {
          glyphs: [
            {
              offset: { x: 6.9, y: 0 },
              size: { x: 1, y: 1 },
              uvOffset: Vec2.zero,
              uvScale: Vec2.one,
              embolden: 0,
            },
          ],
        },
        { outlineWidth: 2, shadowColor: new Color(0, 0, 0, 1) },
      );

      world.update();

      // The effects pass draws inside the same glyph quad as the fill, so
      // a glyph reaching into the view keeps both.
      expect(bindInstanceData).toHaveBeenCalledTimes(2);
    });
  });

  describe('masks', () => {
    /** The masks the first instance `bindInstanceData` bound was drawn through. */
    const boundMask = (bindInstanceData: Mock): InstanceMask | null =>
      (bindInstanceData.mock.calls[0][0] as InstanceComponents).mask;

    const addMaskedParent = (
      shape: Parameters<typeof addMaskComponent>[2]['shape'] = {
        kind: 'rect',
      },
    ): number => {
      const entity = world.createEntity();

      addPositionComponent(world, entity);
      addMaskComponent(world, entity, { width: 4, height: 4, shape });

      return entity;
    };

    it("binds a descendant sprite's instance with its masks", () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();
      const parent = addMaskedParent();
      const child = addSpriteEntity(renderable, 0);

      world.setParent(child, parent);
      world.update();

      expect(boundMask(bindInstanceData)).toMatchObject({
        visible: true,
        clip: { min: { x: -2, y: -2 }, max: { x: 2, y: 2 } },
      });
    });

    it('binds an unmasked sprite with no masks', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();

      addMaskedParent();
      addSpriteEntity(renderable, 0);
      world.update();

      expect(boundMask(bindInstanceData)).toBeNull();
    });

    it('skips sprites a mask hides entirely', () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();
      const parent = addMaskedParent({
        kind: 'linear',
        origin: 'left',
        amount: 0,
      });
      const child = addSpriteEntity(renderable, 0);

      world.setParent(child, parent);
      world.update();

      expect(bindInstanceData).not.toHaveBeenCalled();
    });

    it("skips sprites outside their masks' bounds", () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();
      const parent = addMaskedParent();
      const child = addSpriteEntity(renderable, 10);

      world.setParent(child, parent);
      world.update();

      expect(bindInstanceData).not.toHaveBeenCalled();
    });

    it("binds a descendant text's glyphs with its masks", () => {
      addCameraEntity();
      const { renderable, bindInstanceData } = createRenderable();
      const parent = addMaskedParent({
        kind: 'radial',
        startAngle: 0,
        sweep: Math.PI,
        amount: 0.5,
      });
      const text = addTextEntity(renderable, 0, {
        glyphs: [
          {
            offset: Vec2.zero,
            size: { x: 1, y: 1 },
            uvOffset: Vec2.zero,
            uvScale: Vec2.one,
            embolden: 0,
          },
        ],
      });

      world.setParent(text, parent);
      world.update();

      expect(boundMask(bindInstanceData)?.shape).toMatchObject({
        kind: 'radial',
        filledSweep: Math.PI / 2,
      });
    });
  });
});
