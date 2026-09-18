import { describe, expect, it } from 'vitest';
import {
  addTerrainMeshComponent,
  terrainMeshId,
} from './terrain-mesh-component.js';
import { EcsWorld } from '../../../ecs/index.js';
import type { TerrainMesh } from '../create-terrain-mesh.js';

function fakeMesh(): TerrainMesh {
  return {
    geometry: {} as TerrainMesh['geometry'],
    material: {} as TerrainMesh['material'],
    vertexCount: 6,
  };
}

describe('addTerrainMeshComponent', () => {
  it('attaches a component with default values for unspecified options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const mesh = fakeMesh();

    addTerrainMeshComponent(world, entity, { mesh });

    expect(world.getComponent(entity, terrainMeshId)).toEqual({
      mesh,
      category: 0xffffffff,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const mesh = fakeMesh();

    addTerrainMeshComponent(world, entity, { mesh, category: 1 << 2 });

    expect(world.getComponent(entity, terrainMeshId)).toMatchObject({
      mesh,
      category: 1 << 2,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const mesh = fakeMesh();

    const component = addTerrainMeshComponent(world, entity, { mesh });

    expect(world.getComponent(entity, terrainMeshId)).toBe(component);
  });
});
