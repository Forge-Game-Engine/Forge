import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  ScaleEcsComponent,
  scaleId,
  Time,
} from '../../../common/index.js';
import { EcsSystem } from '../../../ecs/ecs-system.js';
import { EcsWorld } from '../../../ecs/ecs-world.js';
import {
  addMeshComponent,
  MeshEcsComponent,
  meshId,
} from '../../components/mesh-component.js';
import { Geometry } from '../../geometry/geometry.js';
import {
  createMeshMaterial,
  MeshMaterial,
} from '../../materials/mesh-material.js';
import type { RenderContext } from '../../render-context.js';
import { buildTrailRibbon, TrailTransform } from '../build-trail-ribbon.js';
import { TrailEcsComponent, trailId } from '../components/trail-component.js';
import { recordTrail } from '../trail-recording.js';
import { validateTrailSettings } from '../validate-trail-settings.js';

/**
 * Creates an ECS system that records where each trail's entity goes and
 * draws the trail behind it.
 *
 * Each frame it reads the entity's `position.world` (and `rotation.world`
 * and `scale.world`, when it has them), records a point once the entity
 * has moved `minVertexDistance` from the last one, ages the points by
 * `time`'s scaled delta and drops those older than `lifetimeSeconds`, so a
 * trail is the same length at any frame rate. It then builds the ribbon
 * into the trail's own geometry and draws it through a `MeshEcsComponent`
 * it adds to the entity, so the render system draws the trail in the same
 * draw order as sprites, behind the entity's own sprite. It writes only the
 * trail's `state`, its geometry and that mesh.
 *
 * Register it after `createTransformEcsSystem`, whose world transforms it
 * reads, and before `createRenderEcsSystem`, which draws the mesh. Removing
 * a trail, or its entity, frees its geometry; stopping the world or
 * removing this system leaves every trail as it is.
 * @param time - The time the trails age with.
 * @param renderContext - The render context the trails' geometries and
 * materials are created in.
 * @returns The trail ECS system.
 * @throws An error from `update` if a trail's settings are out of range
 * (see `addTrailComponent`), or if its entity has a mesh that isn't its
 * trail's.
 */
export const createTrailEcsSystem = (
  time: Time,
  renderContext: RenderContext,
): EcsSystem<[TrailEcsComponent, PositionEcsComponent]> => ({
  name: 'trail',
  query: [trailId, positionId],
  update: (world, { entities, components: [trails, positions] }) => {
    const getRotation = world.getComponentAccessor(rotationId);
    const getScale = world.getComponentAccessor(scaleId);

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      updateTrail(
        world,
        renderContext,
        entity,
        trails[i],
        getTrailTransform(positions[i], getRotation(entity), getScale(entity)),
        time.deltaTimeInSeconds,
      );
    }
  },
});

const getTrailTransform = (
  position: PositionEcsComponent,
  rotation: RotationEcsComponent | null,
  scale: ScaleEcsComponent | null,
): TrailTransform => ({
  x: position.world.x,
  y: position.world.y,
  rotation: rotation?.world ?? 0,
  scaleX: scale?.world.x ?? 1,
  scaleY: scale?.world.y ?? 1,
});

// The vertex attributes `trail.vert` reads.
const positionAttribute = 'a_position';
const texCoordAttribute = 'a_texCoord';
const colorAttribute = 'a_color';

const createTrailGeometry = (renderContext: RenderContext): Geometry =>
  new Geometry(renderContext, {
    attributes: [
      { name: positionAttribute, data: new Float32Array(0), size: 2 },
      { name: texCoordAttribute, data: new Float32Array(0), size: 2 },
      { name: colorAttribute, data: new Float32Array(0), size: 4 },
    ],
    topology: 'triangleStrip',
  });

/**
 * Returns the mesh that draws the trail's geometry, adding it the first
 * time (or after game code removed it).
 * @param world - The world.
 * @param entity - The trail's entity.
 * @param geometry - The trail's geometry.
 * @param material - The trail's material.
 * @returns The trail's mesh.
 * @throws An error if the entity has another mesh.
 */
const getTrailMesh = (
  world: EcsWorld,
  entity: number,
  geometry: Geometry,
  material: MeshMaterial,
): MeshEcsComponent => {
  const mesh = world.getComponent(entity, meshId);

  if (!mesh) {
    return addMeshComponent(world, entity, { geometry, material });
  }

  if (mesh.geometry !== geometry) {
    throw new Error(
      `Unable to draw the trail of entity ${entity}: it has another mesh, and a trail draws through its entity's one mesh. Put the other mesh on a child entity.`,
    );
  }

  return mesh;
};

const updateTrail = (
  world: EcsWorld,
  renderContext: RenderContext,
  entity: number,
  trail: TrailEcsComponent,
  transform: TrailTransform,
  deltaSeconds: number,
): void => {
  const { state } = trail;

  validateTrailSettings(trail, entity);
  recordTrail(trail, transform.x, transform.y, deltaSeconds);

  state.geometry ??= createTrailGeometry(renderContext);
  state.material ??= createMeshMaterial(
    renderContext,
    'trail.vert',
    'trail.frag',
  );

  const mesh = getTrailMesh(world, entity, state.geometry, state.material);
  const vertexCount = buildTrailRibbon(trail, transform);
  const { buffers } = state;

  state.geometry.update({
    vertexCount,
    attributes: {
      [positionAttribute]: buffers.positions,
      [texCoordAttribute]: buffers.uvs,
      [colorAttribute]: buffers.colors,
    },
  });
  state.material.setUniform(
    'u_texture',
    trail.texture ?? renderContext.whiteTexture,
  );
  mesh.category = trail.category;
  mesh.layer = trail.layer;
};
