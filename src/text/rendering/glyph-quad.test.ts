import { describe, expect, it } from 'vitest';
import {
  PositionEcsComponent,
  RotationEcsComponent,
  ScaleEcsComponent,
} from '../../common/index.js';
import { Color } from '../../rendering/color.js';
import { RenderCommand } from '../../rendering/render-command.js';
import { Renderable } from '../../rendering/renderable.js';
import type { Texture } from '../../rendering/texture.js';
import type { TextRenderables } from './create-text-renderables.js';
import type { TextEcsComponent } from '../components/text-component.js';
import type {
  GlyphQuad,
  TextMeshEcsComponent,
} from '../components/text-mesh-component.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import { pushTextRenderCommands } from './glyph-quad.js';

const fillRenderable = {} as Renderable;
const effectsRenderable = {} as Renderable;
const renderables: TextRenderables = { fillRenderable, effectsRenderable };
const atlasTexture = {} as Texture;

function buildTextComponent(
  overrides: Partial<TextEcsComponent> = {},
): TextEcsComponent {
  return {
    text: 'A',
    fontAtlas: { texture: atlasTexture } as FontAtlas,
    size: 10,
    color: Color.white,
    letterSpacing: 0,
    lineHeight: 1,
    horizontalAlign: 'left',
    verticalAlign: 'top',
    horizontalAlignPivot: 0,
    richText: true,
    layer: 2,
    category: 1,
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
    caretStops: [],
  };
}

const glyph: GlyphQuad = {
  offset: { x: 3, y: 4 },
  size: { x: 5, y: 7 },
  uvOffset: { x: 0.1, y: 0.2 },
  uvScale: { x: 0.3, y: 0.4 },
  embolden: 0,
};

describe('pushTextRenderCommands', () => {
  it('pushes one command per glyph', () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent(),
      buildTextMesh([glyph, glyph]),
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
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
      renderables,
      { position: entityPosition, rotation: null, scale: null, mask: null },
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
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
    );

    expect(commands[0].components.sprite.layer).toBe(3);
    expect(commands[0].components.sprite).toMatchObject({
      width: glyph.size.x,
      height: glyph.size.y,
      pivot: { x: 0.5, y: 0.5 },
      uvOffset: glyph.uvOffset,
      uvScale: glyph.uvScale,
      tintColor: color,
      layer: 3,
    });
  });

  it("tints a glyph with its own rich text color in place of the text's color", () => {
    const commands: RenderCommand[] = [];
    const glyphColor = new Color(0, 1, 0, 0.5);

    pushTextRenderCommands(
      commands,
      buildTextComponent({ color: Color.white }),
      buildTextMesh([{ ...glyph, color: glyphColor }, glyph]),
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
    );

    expect(commands[0].components.sprite.tintColor).toBe(glyphColor);
    expect(commands[1].components.sprite.tintColor).toBe(Color.white);
  });

  it("passes each glyph's embolden to both its effects and fill commands", () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent({ outlineWidth: 1 }),
      buildTextMesh([{ ...glyph, embolden: 0.1 }, glyph]),
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
    );

    expect(commands.map((command) => command.components.textEmbolden)).toEqual([
      0.1, 0, 0.1, 0,
    ]);
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
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
    );

    expect(commands[0].components.textEffects).toEqual({
      outlineColor,
      outlineWidth: 2,
      shadowColor,
      shadowOffset: { x: 1, y: -1 },
      shadowSoftness: 3,
    });
  });

  it('scales outline/shadow sizes by the pixel ratio, so they keep the same physical size on a HiDPI display', () => {
    const commands: RenderCommand[] = [];
    const shadowOffset = { x: 1, y: -1 };

    pushTextRenderCommands(
      commands,
      buildTextComponent({
        outlineWidth: 2,
        shadowColor: Color.black,
        shadowOffset,
        shadowSoftness: 3,
      }),
      buildTextMesh([glyph]),
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
      2,
    );

    expect(commands[0].components.textEffects).toMatchObject({
      outlineWidth: 4,
      shadowOffset: { x: 2, y: -2 },
      shadowSoftness: 6,
    });
    // The component's own offset must not be mutated.
    expect(shadowOffset).toEqual({ x: 1, y: -1 });
  });

  it('shares the same textEffects object across every glyph in the entity', () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent({ outlineWidth: 5 }),
      buildTextMesh([glyph, glyph]),
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
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
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
    );

    // Two glyphs, two passes: [effects, effects, fill, fill] - not
    // interleaved per glyph - so that when these are drawn (effects always
    // as one earlier, contiguous batch than fill, since the render system
    // draws an entity's commands in the order they're pushed), every
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
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
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
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
    );

    expect(commands).toHaveLength(2);
    expect(commands[0].renderable).toBe(effectsRenderable);
    expect(commands[1].renderable).toBe(fillRenderable);
  });

  it("draws every glyph from its font atlas's texture, naming the atlas for the batch", () => {
    const commands: RenderCommand[] = [];
    const textComponent = buildTextComponent({ outlineWidth: 1 });

    pushTextRenderCommands(
      commands,
      textComponent,
      buildTextMesh([glyph]),
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
    );

    for (const command of commands) {
      expect(command.texture).toBe(atlasTexture);
      expect(command.emissiveTexture).toBeNull();
      expect(command.fontAtlas).toBe(textComponent.fontAtlas);
      expect(command.components.sprite.texture).toBe(atlasTexture);
    }
  });

  it('passes rotation and scale components through unchanged, and flip as null', () => {
    const commands: RenderCommand[] = [];
    const rotation: RotationEcsComponent = { local: 0, world: 1.5 };

    pushTextRenderCommands(
      commands,
      buildTextComponent(),
      buildTextMesh([glyph]),
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: rotation,
        scale: null,
        mask: null,
      },
    );

    expect(commands[0].components.rotation).toBe(rotation);
    expect(commands[0].components.scale).toBeNull();
    expect(commands[0].components.flip).toBeNull();
  });

  describe('rotated and scaled text', () => {
    const entityWorld = { x: 10, y: 20 };
    const baselineY = -5;
    const glyphXs = [2, 8, 14];
    const rotationRadians = Math.PI / 6;
    const scale: ScaleEcsComponent = {
      local: { x: 2, y: 3 },
      world: { x: 2, y: 3 },
    };

    const glyphsOnBaseline: GlyphQuad[] = glyphXs.map((x) => ({
      ...glyph,
      offset: { x, y: baselineY },
    }));

    function pushRotatedScaledText(
      textOverrides: Partial<TextEcsComponent> = {},
    ): RenderCommand[] {
      const commands: RenderCommand[] = [];

      pushTextRenderCommands(
        commands,
        buildTextComponent(textOverrides),
        buildTextMesh(glyphsOnBaseline),
        renderables,
        {
          position: { local: { x: 0, y: 0 }, world: { ...entityWorld } },
          rotation: { local: rotationRadians, world: rotationRadians },
          scale,
          mask: null,
        },
      );

      return commands;
    }

    // The rotated, scaled baseline: the line through the entity's position
    // offset by `(0, baselineY)` in the entity's scaled, rotated frame, running
    // along the entity's rotated `+X` axis.
    const cos = Math.cos(rotationRadians);
    const sin = Math.sin(rotationRadians);

    function expectedGlyphCenter(offsetX: number): { x: number; y: number } {
      const x = offsetX * scale.world.x;
      const y = baselineY * scale.world.y;

      return {
        x: entityWorld.x + x * cos - y * sin,
        y: entityWorld.y + x * sin + y * cos,
      };
    }

    it("places each glyph's center on the rotated, scaled baseline", () => {
      const commands = pushRotatedScaledText();

      expect(commands).toHaveLength(glyphXs.length);

      const baselineOrigin = expectedGlyphCenter(0);

      commands.forEach((command, index) => {
        const center = command.components.position.world;
        const expected = expectedGlyphCenter(glyphXs[index]);

        expect(center.x).toBeCloseTo(expected.x);
        expect(center.y).toBeCloseTo(expected.y);

        // Distance from the rotated baseline (perpendicular to its rotated
        // +X direction) is zero.
        const fromOrigin = {
          x: center.x - baselineOrigin.x,
          y: center.y - baselineOrigin.y,
        };

        expect(-fromOrigin.x * sin + fromOrigin.y * cos).toBeCloseTo(0);

        // Distance along the baseline is the glyph's offset, scaled.
        expect(fromOrigin.x * cos + fromOrigin.y * sin).toBeCloseTo(
          glyphXs[index] * scale.world.x,
        );
      });
    });

    it('places effects-pass glyphs on the same rotated, scaled baseline as their fill', () => {
      const commands = pushRotatedScaledText({ outlineWidth: 1 });

      expect(commands).toHaveLength(glyphXs.length * 2);

      commands.forEach((command, index) => {
        const expected = expectedGlyphCenter(glyphXs[index % glyphXs.length]);

        expect(command.components.position.world.x).toBeCloseTo(expected.x);
        expect(command.components.position.world.y).toBeCloseTo(expected.y);
      });
    });
  });

  it('pushes nothing for a mesh with no glyphs', () => {
    const commands: RenderCommand[] = [];

    pushTextRenderCommands(
      commands,
      buildTextComponent(),
      buildTextMesh([]),
      renderables,
      {
        position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
        rotation: null,
        scale: null,
        mask: null,
      },
    );

    expect(commands).toHaveLength(0);
  });
});
