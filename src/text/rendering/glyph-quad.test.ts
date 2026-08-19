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

const fillRenderable = { category: 1 } as Renderable;
const effectsRenderable = { category: 1 } as Renderable;

function buildTextComponent(
  overrides: Partial<TextEcsComponent> = {},
): TextEcsComponent {
  return {
    text: 'A',
    fontAtlas: {} as FontAtlas,
    size: 10,
    color: Color.white,
    letterSpacing: 0,
    lineHeight: 1,
    horizontalAlign: 'left',
    verticalAlign: 'top',
    layer: 2,
    category: 1,
    enabled: true,
    outlineColor: Color.black,
    outlineWidth: 0,
    shadowColor: Color.transparent,
    shadowOffset: { x: 0, y: 0 },
    shadowSoftness: 0,
    ...overrides,
  };
}

function buildTextMesh(glyphs: GlyphQuad[]): TextMeshEcsComponent {
  return {
    glyphs,
    bounds: { width: 0, height: 0 },
    fillRenderable,
    effectsRenderable,
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

  it("builds textEffects from the text component's outline/shadow fields", () => {
    const commands: RenderCommand[] = [];
    const outlineColor = new Color(0, 1, 0, 1);
    const shadowColor = new Color(0, 0, 1, 1);

    pushTextRenderCommands(
      commands,
      buildTextComponent({
        outlineColor,
        outlineWidth: 2,
        shadowColor,
        shadowOffset: { x: 1, y: -1 },
        shadowSoftness: 3,
      }),
      buildTextMesh([glyph]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
      null,
      null,
    );

    expect(commands[0].components.textEffects).toEqual({
      outlineColor,
      outlineWidth: 2,
      shadowColor,
      shadowOffset: { x: 1, y: -1 },
      shadowSoftness: 3,
    });
  });

  it('shares the same textEffects object across every glyph in the entity', () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent({ outlineWidth: 5 }),
      buildTextMesh([glyph, glyph]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
      null,
      null,
    );

    // Outline/shadow are uniform across a whole `TextEcsComponent`, so the
    // same `textEffects` instance is reused for every glyph rather than
    // rebuilt per glyph.
    expect(commands[0].components.textEffects).toBe(
      commands[1].components.textEffects,
    );
  });

  it("pushes every glyph's effects command before any glyph's fill command, using effectsRenderable/fillRenderable respectively", () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent({ outlineWidth: 2 }),
      buildTextMesh([glyph, glyph]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
      null,
      null,
    );

    // Two glyphs, two passes: [effects, effects, fill, fill] - not
    // interleaved per glyph - so that when these are drawn (effects always
    // as one earlier, contiguous batch than fill, since both passes share
    // the same layer/depth and the render system's sort is stable), every
    // glyph's fill ends up on top of every glyph's outline/shadow,
    // regardless of how far an outline reaches into a neighboring glyph.
    expect(commands).toHaveLength(4);
    expect(commands[0].renderable).toBe(effectsRenderable);
    expect(commands[0].components.textEffects).toBeDefined();
    expect(commands[1].renderable).toBe(effectsRenderable);
    expect(commands[1].components.textEffects).toBeDefined();
    expect(commands[2].renderable).toBe(fillRenderable);
    expect(commands[2].components.textEffects).toBeUndefined();
    expect(commands[3].renderable).toBe(fillRenderable);
    expect(commands[3].components.textEffects).toBeUndefined();
  });

  it('skips the effects pass entirely when there is no outline and no shadow, pushing only fill commands', () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent({ outlineWidth: 0, shadowColor: Color.transparent }),
      buildTextMesh([glyph, glyph]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
      null,
      null,
    );

    expect(commands).toHaveLength(2);
    expect(
      commands.every((command) => command.renderable === fillRenderable),
    ).toBe(true);
  });

  it('still pushes the effects pass for a shadow-only text component (outlineWidth 0, opaque shadowColor)', () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent({
        outlineWidth: 0,
        shadowColor: new Color(0, 0, 0, 0.5),
      }),
      buildTextMesh([glyph]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
      null,
      null,
    );

    expect(commands).toHaveLength(2);
    expect(commands[0].renderable).toBe(effectsRenderable);
    expect(commands[1].renderable).toBe(fillRenderable);
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

  it('uses sortDepth instead of world Y when set', () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent({ sortDepth: 3 }),
      buildTextMesh([glyph]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 42 } },
      null,
      null,
    );

    expect(commands[0].depth).toBe(3);
  });

  it('uses sortDepth for both the effects pass and the fill pass', () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent({ sortDepth: 3, outlineWidth: 2 }),
      buildTextMesh([glyph]),
      { local: { x: 0, y: 0 }, world: { x: 0, y: 42 } },
      null,
      null,
    );

    expect(commands).toHaveLength(2);
    expect(commands[0].depth).toBe(3);
    expect(commands[1].depth).toBe(3);
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
          fillRenderable: mismatchedRenderable,
          effectsRenderable: mismatchedRenderable,
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
