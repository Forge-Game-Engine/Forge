import { describe, expect, it } from 'vitest';
import {
  addRotationComponent,
  addScaleComponent,
  PositionEcsComponent,
  RotationEcsComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color } from '../../rendering/color.js';
import { RenderCommand } from '../../rendering/render-command.js';
import { Renderable } from '../../rendering/renderable.js';
import type { TextEcsComponent } from '../components/text-component.js';
import type {
  GlyphQuad,
  TextMeshEcsComponent,
} from '../components/text-mesh-component.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import {
  buildTextCameraCommands,
  pushTextRenderCommands,
} from './glyph-quad.js';

const renderable = { category: 1 } as Renderable;

function buildTextComponent(
  overrides: Partial<TextEcsComponent> = {},
): TextEcsComponent {
  return {
    text: 'A',
    fontAtlas: {} as FontAtlas,
    size: 10,
    color: Color.white,
    letterSpacing: 0,
    layer: 2,
    enabled: true,
    ...overrides,
  };
}

function buildTextMesh(glyphs: GlyphQuad[]): TextMeshEcsComponent {
  return {
    glyphs,
    bounds: { width: 0, height: 0 },
    renderable,
  };
}

const glyph: GlyphQuad = {
  offset: { x: 3, y: 4 },
  size: { x: 5, y: 7 },
  uvOffset: { x: 0.1, y: 0.2 },
  uvScale: { x: 0.3, y: 0.4 },
};

describe('pushTextRenderCommands', () => {
  it('pushes one command per glyph', () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent(),
      buildTextMesh([glyph, glyph]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
      null,
      null,
    );

    expect(commands).toHaveLength(2);
  });

  it("positions a glyph at the entity's world position plus the glyph's offset", () => {
    const commands: RenderCommand[] = [];
    const entityPosition: PositionEcsComponent = {
      local: { x: 1, y: 1 },
      world: { x: 10, y: 20 },
    };

    pushTextRenderCommands(
      commands,
      buildTextComponent(),
      buildTextMesh([glyph]),
      entityPosition,
      null,
      null,
    );

    expect(commands[0].components.position.world).toEqual({ x: 13, y: 24 });
    // The entity's own world position must not be mutated.
    expect(entityPosition.world).toEqual({ x: 10, y: 20 });
  });

  it('builds a synthetic sprite centered on the glyph, tinted by the text color', () => {
    const commands: RenderCommand[] = [];
    const color = new Color(1, 0, 0, 1);

    pushTextRenderCommands(
      commands,
      buildTextComponent({ color, layer: 3 }),
      buildTextMesh([glyph]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
      null,
      null,
    );

    expect(commands[0].layer).toBe(3);
    expect(commands[0].components.sprite).toMatchObject({
      width: glyph.size.x,
      height: glyph.size.y,
      pivot: { x: 0.5, y: 0.5 },
      uvOffset: glyph.uvOffset,
      uvScale: glyph.uvScale,
      tintColor: color,
      enabled: true,
      layer: 3,
    });
  });

  it("uses the entity's world Y as depth", () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent(),
      buildTextMesh([glyph]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 42 } },
      null,
      null,
    );

    expect(commands[0].depth).toBe(42);
  });

  it('passes rotation and scale components through unchanged, and flip as null', () => {
    const commands: RenderCommand[] = [];
    const rotation: RotationEcsComponent = { local: 0, world: 1.5 };

    pushTextRenderCommands(
      commands,
      buildTextComponent(),
      buildTextMesh([glyph]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
      rotation,
      null,
    );

    expect(commands[0].components.rotation).toBe(rotation);
    expect(commands[0].components.scale).toBeNull();
    expect(commands[0].components.flip).toBeNull();
  });

  it('pushes nothing for a mesh with no glyphs', () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent(),
      buildTextMesh([]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
      null,
      null,
    );

    expect(commands).toHaveLength(0);
  });
});

describe('buildTextCameraCommands', () => {
  const position: PositionEcsComponent = {
    local: { x: 0, y: 0 },
    world: { x: 0, y: 0 },
  };

  it('pushes commands for an enabled entity matching the culling mask', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const commands: RenderCommand[] = [];

    buildTextCameraCommands(
      world,
      [buildTextComponent()],
      [buildTextMesh([glyph, glyph])],
      [position],
      [entity],
      0xffffffff,
      commands,
    );

    expect(commands).toHaveLength(2);
  });

  it('skips a disabled text entity', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const commands: RenderCommand[] = [];

    buildTextCameraCommands(
      world,
      [buildTextComponent({ enabled: false })],
      [buildTextMesh([glyph])],
      [position],
      [entity],
      0xffffffff,
      commands,
    );

    expect(commands).toHaveLength(0);
  });

  it("skips text whose mesh renderable category does not match the camera's culling mask", () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const commands: RenderCommand[] = [];
    const mismatchedRenderable = { category: 0b0001 } as Renderable;

    buildTextCameraCommands(
      world,
      [buildTextComponent()],
      [
        {
          glyphs: [glyph],
          bounds: { width: 0, height: 0 },
          renderable: mismatchedRenderable,
        },
      ],
      [position],
      [entity],
      0b0010,
      commands,
    );

    expect(commands).toHaveLength(0);
  });

  it("looks up the entity's rotation and scale components from the world", () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const rotation = addRotationComponent(world, entity, { world: 1.5 });
    const scale = addScaleComponent(world, entity, {
      world: { x: 2, y: 2 },
    });
    const commands: RenderCommand[] = [];

    buildTextCameraCommands(
      world,
      [buildTextComponent()],
      [buildTextMesh([glyph])],
      [position],
      [entity],
      0xffffffff,
      commands,
    );

    expect(commands[0].components.rotation).toBe(rotation);
    expect(commands[0].components.scale).toBe(scale);
  });
});
