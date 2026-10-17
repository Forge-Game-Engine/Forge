import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { Geometry } from '../geometry/geometry.js';
import type { MeshMaterial } from '../materials/mesh-material.js';
import { addMeshComponent, meshId } from './mesh-component.js';

describe('addMeshComponent', () => {
  const createGeometry = (
    positionSize: number | null,
    sectionCount = 0,
  ): Geometry =>
    ({
      getAttributeSize: (name: string): number | null =>
        name === 'a_position' ? positionSize : null,
      sections: Array.from({ length: sectionCount }, (_, index) => ({
        start: index * 3,
        count: 3,
      })),
    }) as unknown as Geometry;

  const material = {} as MeshMaterial;

  it('attaches the mesh with category 1, layer 0 and no section by default', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const geometry = createGeometry(2);

    const mesh = addMeshComponent(world, entity, { geometry, material });

    expect(mesh).toEqual({
      geometry,
      material,
      category: 1,
      layer: 0,
      section: null,
    });
    expect(world.getComponent(entity, meshId)).toBe(mesh);
  });

  it('keeps the category and layer it is given', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const mesh = addMeshComponent(world, entity, {
      geometry: createGeometry(3),
      material,
      category: 0b100,
      layer: -2,
    });

    expect(mesh.category).toBe(0b100);
    expect(mesh.layer).toBe(-2);
  });

  it('throws for a geometry without an a_position attribute', () => {
    const world = new EcsWorld();

    expect(() =>
      addMeshComponent(world, world.createEntity(), {
        geometry: createGeometry(null),
        material,
      }),
    ).toThrow('but it has none');
  });

  it.each([1, 4])(
    'throws for an a_position attribute of size %i',
    (positionSize) => {
      const world = new EcsWorld();

      expect(() =>
        addMeshComponent(world, world.createEntity(), {
          geometry: createGeometry(positionSize),
          material,
        }),
      ).toThrow(`but it has size ${positionSize}`);
    },
  );

  it('keeps a section the geometry has', () => {
    const world = new EcsWorld();

    const mesh = addMeshComponent(world, world.createEntity(), {
      geometry: createGeometry(2, 3),
      material,
      section: 2,
    });

    expect(mesh.section).toBe(2);
  });

  it.each([3, -1, 0.5])(
    'throws for section %d, which the geometry does not have',
    (section) => {
      const world = new EcsWorld();
      const entity = world.createEntity();

      expect(() =>
        addMeshComponent(world, entity, {
          geometry: createGeometry(2, 3),
          material,
          section,
        }),
      ).toThrow(
        `Unable to add a mesh to entity ${entity}: its geometry has no section ${section} (it has 3 sections).`,
      );
    },
  );
});
