import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import type { Geometry } from '../geometry/geometry.js';
import type { MeshMaterial } from '../materials/mesh-material.js';

/**
 * Fields of {@link MeshEcsComponent} with no sensible default; callers must
 * always provide these.
 */
export interface MeshRequiredOptions {
  /**
   * The vertices to draw, in the entity's local space. Must have an
   * `a_position` attribute of size 2 or 3 (x and y are drawn and culled
   * with). Whoever created the geometry owns it: change its vertices with
   * `Geometry.update`, and dispose it after removing every component that
   * draws it.
   */
  geometry: Geometry;

  /**
   * The material to draw the geometry with, from `createMeshMaterial`. The
   * mesh's textures and other values are the material's uniforms.
   */
  material: MeshMaterial;
}

/**
 * Fields of {@link MeshEcsComponent} with a sensible default; callers may
 * omit these.
 */
export interface MeshDefaultedOptions {
  /**
   * The render category the mesh belongs to, matched against each camera's
   * `cullingMask` to decide which cameras draw it. Defaults to `1`, as for
   * sprites and text.
   */
  category: number;

  /**
   * The draw-order layer for this mesh, shared with sprites and text drawn
   * by the same camera: lower layers are drawn first, so higher layers
   * appear on top. Within a layer, meshes draw by their entity's
   * `DrawOrderEcsComponent` and then in hierarchy order, with sprites and
   * text (see the rendering guide). Defaults to `0`.
   */
  layer: number;
}

/**
 * Draws a geometry with a mesh material at the entity's world position,
 * rotated and scaled by its world rotation and scale. Drawn by
 * `createRenderEcsSystem` in the same draw order as sprites and text, for
 * every camera whose `cullingMask` matches `category`. An entity's mesh draws
 * before (behind) its own sprite and text. Add one with
 * {@link addMeshComponent}.
 */
export interface MeshEcsComponent
  extends MeshRequiredOptions, MeshDefaultedOptions {}

/** The component key of {@link MeshEcsComponent}. */
export const meshId = createComponentId<MeshEcsComponent>('mesh');

const defaultMeshOptions: MeshDefaultedOptions = {
  category: 1,
  layer: 0,
};

/**
 * Attaches a {@link MeshEcsComponent} to `entity`. The entity also needs a
 * `PositionEcsComponent` to be drawn.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the mesh. `geometry` and
 * `material` have no sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 * @throws An error if `geometry` has no `a_position` attribute of size 2 or
 * 3.
 */
export function addMeshComponent(
  world: EcsWorld,
  entity: number,
  options: MeshRequiredOptions & Partial<MeshDefaultedOptions>,
): MeshEcsComponent {
  const positionSize = options.geometry.getAttributeSize('a_position');

  if (positionSize === null) {
    throw new Error(
      `Unable to add a mesh to entity ${entity}: its geometry needs an "a_position" attribute of size 2 or 3, but it has none.`,
    );
  }

  if (positionSize !== 2 && positionSize !== 3) {
    throw new Error(
      `Unable to add a mesh to entity ${entity}: its geometry needs an "a_position" attribute of size 2 or 3, but it has size ${positionSize}.`,
    );
  }

  const component: MeshEcsComponent = withDefaults(defaultMeshOptions, options);

  return world.addComponent(entity, meshId, component);
}
