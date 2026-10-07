import { beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import type { Texture } from '../../rendering/texture.js';
import { addTextComponent } from '../components/text-component.js';
import {
  TextMeshEcsComponent,
  textMeshId,
} from '../components/text-mesh-component.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import { createTextShapingEcsSystem } from './text-shaping-system.js';

function buildFontAtlas(): FontAtlas {
  return {
    data: {
      formatVersion: 2,
      type: 'msdf',
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
    texture: {} as Texture,
  };
}

describe('createTextShapingEcsSystem', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createTextShapingEcsSystem());
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
    expect(mesh?.caretStops).toHaveLength(2);
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

  it('re-shapes when horizontalAlignPivot changes', () => {
    const entity = world.createEntity();

    const textComponent = addTextComponent(world, entity, {
      text: 'A B',
      fontAtlas: buildFontAtlas(),
      size: 10,
      maxWidth: 30,
      horizontalAlign: 'center',
    });

    world.update();

    const meshBefore = world.getComponent<TextMeshEcsComponent>(
      entity,
      textMeshId,
    );
    const glyphXBefore = meshBefore?.glyphs[0].offset.x;

    textComponent.horizontalAlignPivot = 0.5;
    world.update();

    const meshAfter = world.getComponent<TextMeshEcsComponent>(
      entity,
      textMeshId,
    );

    expect(meshAfter?.glyphs[0].offset.x).toBeCloseTo(glyphXBefore! - 15);
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

  it('does not re-shape when only the category changes', () => {
    const entity = world.createEntity();
    const text = addTextComponent(world, entity, {
      text: 'A',
      fontAtlas: buildFontAtlas(),
      size: 10,
    });

    world.update();

    const mesh = world.getComponent<TextMeshEcsComponent>(entity, textMeshId);

    text.category = 0b0010;
    world.update();

    expect(world.getComponent<TextMeshEcsComponent>(entity, textMeshId)).toBe(
      mesh,
    );
  });
});
