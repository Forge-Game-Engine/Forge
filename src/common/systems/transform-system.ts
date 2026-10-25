import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParentEcsComponent, parentId } from '../../ecs/hierarchy.js';
import { Vec2 } from '../../math/index.js';
import {
  LocalTransformSnapshot,
  PositionEcsComponent,
  positionId,
  rotationId,
  scaleId,
  transformInterpolationId,
} from '../components/index.js';
import { Time } from '../time/index.js';
import {
  copyLocalTransformInto,
  resolveDrawnLocalTransform,
} from '../transforms/local-transform-snapshot.js';

function setLocalAsWorldIfExists(
  entity: number,
  world: EcsWorld,
  local: LocalTransformSnapshot,
): void {
  const positionComponent = world.getComponent(entity, positionId);

  if (positionComponent) {
    positionComponent.world.x = local.position.x;
    positionComponent.world.y = local.position.y;
  }

  const rotationComponent = world.getComponent(entity, rotationId);

  if (rotationComponent) {
    rotationComponent.world = local.rotation;
  }

  const scaleComponent = world.getComponent(entity, scaleId);

  if (scaleComponent) {
    scaleComponent.world.x = local.scale.x;
    scaleComponent.world.y = local.scale.y;
  }
}

function composePositionWithParent(
  entity: number,
  parentEntity: number,
  world: EcsWorld,
  local: LocalTransformSnapshot,
): void {
  const positionComponent = world.getComponent(entity, positionId);

  if (!positionComponent) {
    return;
  }

  const parentPosition = world.getComponent(parentEntity, positionId);

  if (!parentPosition) {
    positionComponent.world.x = local.position.x;
    positionComponent.world.y = local.position.y;

    return;
  }

  const parentRotation = world.getComponent(parentEntity, rotationId);
  const parentScale = world.getComponent(parentEntity, scaleId);
  const offset = Vec2.clone(local.position);

  if (parentScale) {
    Vec2.multiplyComponents(offset, parentScale.world);
  }

  if (parentRotation) {
    Vec2.rotate(offset, parentRotation.world);
  }

  positionComponent.world.x = parentPosition.world.x + offset.x;
  positionComponent.world.y = parentPosition.world.y + offset.y;
}

function composeRotationWithParent(
  entity: number,
  parentEntity: number,
  world: EcsWorld,
  local: LocalTransformSnapshot,
): void {
  const rotationComponent = world.getComponent(entity, rotationId);

  if (!rotationComponent) {
    return;
  }

  const parentRotation = world.getComponent(parentEntity, rotationId);

  rotationComponent.world = parentRotation
    ? parentRotation.world + local.rotation
    : local.rotation;
}

function composeScaleWithParent(
  entity: number,
  parentEntity: number,
  world: EcsWorld,
  local: LocalTransformSnapshot,
): void {
  const scaleComponent = world.getComponent(entity, scaleId);

  if (!scaleComponent) {
    return;
  }

  const parentScale = world.getComponent(parentEntity, scaleId);

  if (!parentScale) {
    scaleComponent.world.x = local.scale.x;
    scaleComponent.world.y = local.scale.y;

    return;
  }

  scaleComponent.world.x = parentScale.world.x * local.scale.x;
  scaleComponent.world.y = parentScale.world.y * local.scale.y;
}

function composeWithParent(
  entity: number,
  parentEntity: number,
  world: EcsWorld,
  local: LocalTransformSnapshot,
): void {
  composePositionWithParent(entity, parentEntity, world, local);
  composeRotationWithParent(entity, parentEntity, world, local);
  composeScaleWithParent(entity, parentEntity, world, local);
}

// Writes the local transform to compose the entity's `world` from into
// `local`. Inside a fixed step that's `local` exactly, and an interpolated
// entity's `local` is recorded as the start of the step: this pass runs
// after anything that teleports entities in the step and before physics
// moves them. Outside a fixed step, an interpolated entity is drawn between
// the latest step's start and end.
function resolveLocal(
  entity: number,
  world: EcsWorld,
  time: Time,
  local: LocalTransformSnapshot,
): void {
  if (time.isInFixedStep) {
    const interpolation = world.getComponent(entity, transformInterpolationId);

    if (interpolation) {
      copyLocalTransformInto(world, entity, interpolation.stepStart);
    }
  }

  resolveDrawnLocalTransform(world, entity, time, local);
}

// The parent component a static entity was frozen under, keyed by its
// position component. `setParent` and `removeParent` replace or remove the
// parent component, so a frozen entity whose stored one no longer matches
// has been reparented and is recomputed.
type FrozenTransforms = WeakMap<
  PositionEcsComponent,
  ParentEcsComponent | null
>;

interface TransformPass {
  readonly world: EcsWorld;
  readonly time: Time;
  readonly computed: Set<number>;
  readonly frozen: FrozenTransforms;
  // Scratch space for the entity being composed. An entity's parent is
  // composed before its own local transform is resolved, so one is enough.
  readonly local: LocalTransformSnapshot;
}

function computeWorld(entity: number, pass: TransformPass): void {
  const { world, computed, frozen } = pass;
  const positionComponent = world.getComponent(entity, positionId);
  const parentComponent = world.getComponent(entity, parentId);

  // Static entities (and their static ancestors) have their world transform
  // computed once and then skipped on every subsequent frame. Re-checking
  // `isStatic` and the parent unfreezes an entity whose `isStatic` has been
  // cleared or that has been reparented.
  if (positionComponent && frozen.has(positionComponent)) {
    if (
      positionComponent.isStatic &&
      frozen.get(positionComponent) === parentComponent
    ) {
      return;
    }

    frozen.delete(positionComponent);
  }

  if (computed.has(entity)) {
    return;
  }

  const hasRotation = world.getComponent(entity, rotationId);
  const hasScale = world.getComponent(entity, scaleId);

  if (!positionComponent && !hasRotation && !hasScale) {
    return;
  }

  if (!parentComponent) {
    resolveLocal(entity, world, pass.time, pass.local);
    setLocalAsWorldIfExists(entity, world, pass.local);
    computed.add(entity);

    if (positionComponent?.isStatic) {
      frozen.set(positionComponent, null);
    }

    return;
  }

  const parentEntity = parentComponent.parent;

  computeWorld(parentEntity, pass);

  resolveLocal(entity, world, pass.time, pass.local);
  composeWithParent(entity, parentEntity, world, pass.local);

  computed.add(entity);

  const parentPosition = world.getComponent(parentEntity, positionId);

  if (
    positionComponent?.isStatic &&
    parentPosition &&
    frozen.has(parentPosition)
  ) {
    frozen.set(positionComponent, parentComponent);
  }
}

/**
 * Creates a system that computes the world position, rotation and scale of
 * every entity from its local transform and, if it has a `ParentEcsComponent`,
 * its parent's world transform.
 *
 * Inside a fixed step (`time.isInFixedStep`), it composes `world` from `local`
 * exactly, so the physics systems after it read the simulated pose, and
 * records the `local` transform of each entity with a
 * `TransformInterpolationEcsComponent` as its `stepStart`. Outside a fixed
 * step, such an entity whose `local` equals its `stepEnd` is composed from the
 * blend of `stepStart` and `stepEnd` by `time.fixedOverstepFraction` (rotation
 * along the shorter arc), and every other entity from `local`. Children
 * compose on their parent's `world`, so they follow an interpolated parent.
 *
 * Entities (and their entire parent chain) with `PositionEcsComponent.isStatic`
 * set to `true` have their world transform computed once and then skipped on
 * every subsequent pass.
 * @param time - The time whose fixed step and overstep fraction the system
 * reads.
 * @returns The transform ECS system.
 */
export const createTransformEcsSystem = (
  time: Time,
): EcsSystem<[PositionEcsComponent]> => {
  const computed = new Set<number>();

  // The position components of entities whose world transform is static and
  // has already been computed, so `computeWorld` can skip them entirely.
  // Persists across frames. Keyed by component rather than entity, so
  // removing the entity (or its position) drops it from the map, and a
  // position added later starts unfrozen.
  const frozen: FrozenTransforms = new WeakMap();

  return {
    query: [positionId],

    update: (world, { entities }) => {
      computed.clear();

      const pass: TransformPass = {
        world,
        time,
        computed,
        frozen,
        local: { position: Vec2.zero, rotation: 0, scale: Vec2.one },
      };

      for (const entity of entities) {
        computeWorld(entity, pass);
      }
    },
  };
};
