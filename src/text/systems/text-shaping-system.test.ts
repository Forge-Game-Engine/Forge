import { describe, expect, it } from 'vitest';
import { createTextShapingEcsSystem } from './text-shaping-system.js';
import { EcsWorld } from '../../ecs/index.js';
import { addPositionComponent } from '../../common/index.js';
import type { FontAtlas } from '../../asset-loading/index.js';
import type { Renderable } from '../../rendering/renderable.js';
import { addTextComponent, textId } from '../components/text-component.js';
import { textMeshId } from '../components/text-mesh-component.js';

const renderable = {} as Renderable;

function createFont(): FontAtlas {
  return {
    image: {} as HTMLImageElement,
    atlasWidth: 512,
    atlasHeight: 512,
    distanceRange: 4,
    emSize: 1,
    lineHeight: 1.2,
    ascender: 0.9,
    descender: -0.2,
    glyphs: new Map([
      [
        65,
        {
          advance: 0.6,
          planeBounds: { left: 0, bottom: 0, right: 0.6, top: 0.7 },
          uvOffset: { x: 0, y: 0 },
          uvScale: { x: 0.1, y: 0.1 },
        },
      ],
    ]),
    kerning: new Map(),
  };
}

describe('createTextShapingEcsSystem', () => {
  it('shapes an entity with a TextEcsComponent but no TextMeshEcsComponent yet', () => {
    const world = new EcsWorld();
    const system = createTextShapingEcsSystem();
    world.addSystem(system);

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addTextComponent(world, entity, {
      text: 'A',
      font: createFont(),
      renderable,
      fontSize: 10,
    });

    world.update();

    const mesh = world.getComponent(entity, textMeshId);

    expect(mesh?.glyphs).toHaveLength(1);
  });

  it('skips disabled text entities', () => {
    const world = new EcsWorld();
    const system = createTextShapingEcsSystem();
    world.addSystem(system);

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addTextComponent(world, entity, {
      text: 'A',
      font: createFont(),
      renderable,
      fontSize: 10,
      enabled: false,
    });

    world.update();

    expect(world.getComponent(entity, textMeshId)).toBeNull();
  });

  it('does not re-shape when nothing shape-affecting changed', () => {
    const world = new EcsWorld();
    const system = createTextShapingEcsSystem();
    world.addSystem(system);

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addTextComponent(world, entity, {
      text: 'A',
      font: createFont(),
      renderable,
      fontSize: 10,
    });

    world.update();

    const meshAfterFirstUpdate = world.getComponent(entity, textMeshId);
    const glyphsAfterFirstUpdate = meshAfterFirstUpdate?.glyphs;

    world.update();

    const meshAfterSecondUpdate = world.getComponent(entity, textMeshId);

    // Same component instance (mutated in place, not replaced) and the
    // same `glyphs` array reference - proof `shapeText` wasn't called
    // again, since a reshape always allocates a fresh glyphs array.
    expect(meshAfterSecondUpdate).toBe(meshAfterFirstUpdate);
    expect(meshAfterSecondUpdate?.glyphs).toBe(glyphsAfterFirstUpdate);
  });

  it('re-shapes when the text changes', () => {
    const world = new EcsWorld();
    const system = createTextShapingEcsSystem();
    world.addSystem(system);

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    const text = addTextComponent(world, entity, {
      text: 'A',
      font: createFont(),
      renderable,
      fontSize: 10,
    });

    world.update();

    const glyphsAfterFirstUpdate = world.getComponent(
      entity,
      textMeshId,
    )?.glyphs;

    text.text = 'AA';
    world.update();

    const glyphsAfterSecondUpdate = world.getComponent(
      entity,
      textMeshId,
    )?.glyphs;

    expect(glyphsAfterSecondUpdate).not.toBe(glyphsAfterFirstUpdate);
    expect(glyphsAfterSecondUpdate).toHaveLength(2);
  });

  it('re-shapes when fontSize changes', () => {
    const world = new EcsWorld();
    const system = createTextShapingEcsSystem();
    world.addSystem(system);

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    const text = addTextComponent(world, entity, {
      text: 'A',
      font: createFont(),
      renderable,
      fontSize: 10,
    });

    world.update();

    const boundsAfterFirstUpdate = world.getComponent(entity, textMeshId)
      ?.bounds.x;

    text.fontSize = 20;
    world.update();

    const boundsAfterSecondUpdate = world.getComponent(entity, textMeshId)
      ?.bounds.x;

    expect(boundsAfterSecondUpdate).toBeGreaterThan(boundsAfterFirstUpdate!);
  });

  it('re-shapes when wrapWidth, lineSpacing, alignment, or pivot change', () => {
    const world = new EcsWorld();
    const system = createTextShapingEcsSystem();
    world.addSystem(system);

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    const text = addTextComponent(world, entity, {
      text: 'A A',
      font: createFont(),
      renderable,
      fontSize: 10,
    });

    world.update();

    const firstGlyphs = world.getComponent(entity, textMeshId)?.glyphs;

    text.wrapWidth = 1;
    world.update();

    const secondGlyphs = world.getComponent(entity, textMeshId)?.glyphs;

    expect(secondGlyphs).not.toBe(firstGlyphs);

    text.lineSpacing = 2;
    world.update();

    const thirdGlyphs = world.getComponent(entity, textMeshId)?.glyphs;

    expect(thirdGlyphs).not.toBe(secondGlyphs);

    text.alignment = 'center';
    world.update();

    const fourthGlyphs = world.getComponent(entity, textMeshId)?.glyphs;

    expect(fourthGlyphs).not.toBe(thirdGlyphs);

    text.pivot = { x: 0, y: 0 };
    world.update();

    const fifthGlyphs = world.getComponent(entity, textMeshId)?.glyphs;

    expect(fifthGlyphs).not.toBe(fourthGlyphs);
  });

  it('does not re-shape when only non-shape-affecting fields change', () => {
    const world = new EcsWorld();
    const system = createTextShapingEcsSystem();
    world.addSystem(system);

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    const text = addTextComponent(world, entity, {
      text: 'A',
      font: createFont(),
      renderable,
      fontSize: 10,
    });

    world.update();

    const glyphsAfterFirstUpdate = world.getComponent(
      entity,
      textMeshId,
    )?.glyphs;

    text.layer = 5;
    world.update();

    const glyphsAfterSecondUpdate = world.getComponent(
      entity,
      textMeshId,
    )?.glyphs;

    expect(glyphsAfterSecondUpdate).toBe(glyphsAfterFirstUpdate);
  });

  it('queries only entities with a TextEcsComponent', () => {
    const system = createTextShapingEcsSystem();

    expect(system.query).toEqual([textId]);
  });
});
