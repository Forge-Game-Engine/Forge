import { describe, expect, it } from 'vitest';
import { addTextMeshComponent, textMeshId } from './text-mesh-component.js';
import { EcsWorld } from '../../ecs/index.js';
import type { FontAtlas } from '../../asset-loading/index.js';

const font = {} as FontAtlas;

describe('addTextMeshComponent', () => {
  it('attaches the given shaped text data as-is', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const options = {
      glyphs: [
        {
          offset: { x: 0, y: 0 },
          size: { x: 1, y: 1 },
          uvOffset: { x: 0, y: 0 },
          uvScale: { x: 1, y: 1 },
        },
      ],
      bounds: { x: 1, y: 1 },
      sourceText: 'A',
      sourceFont: font,
      sourceFontSize: 16,
      sourceWrapWidth: undefined,
      sourceLineSpacing: 1,
      sourceAlignment: 'left' as const,
      sourcePivot: { x: 0.5, y: 0.5 },
    };

    addTextMeshComponent(world, entity, options);

    expect(world.getComponent(entity, textMeshId)).toBe(options);
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const options = {
      glyphs: [],
      bounds: { x: 0, y: 0 },
      sourceText: '',
      sourceFont: font,
      sourceFontSize: 16,
      sourceWrapWidth: undefined,
      sourceLineSpacing: 1,
      sourceAlignment: 'left' as const,
      sourcePivot: { x: 0.5, y: 0.5 },
    };

    const component = addTextMeshComponent(world, entity, options);

    expect(world.getComponent(entity, textMeshId)).toBe(component);
  });
});
