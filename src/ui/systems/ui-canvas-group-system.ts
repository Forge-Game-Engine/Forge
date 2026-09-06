import {
  ParentEcsComponent,
  parentId,
  PositionEcsComponent,
  positionId,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { SpriteEcsComponent, spriteId } from '../../rendering/index.js';
import { TextEcsComponent, textId } from '../../text/index.js';
import {
  CanvasGroupEcsComponent,
  canvasGroupId,
} from '../components/canvas-group-component.js';
import {
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';

/** The `alpha`/`interactable`/`blocksRaycasts` inherited from ancestor `CanvasGroupEcsComponent`s, before this entity's own is combined in. */
interface InheritedCanvasGroupState {
  alpha: number;
  interactable: boolean;
  blocksRaycasts: boolean;
}

const identityInheritedState: InheritedCanvasGroupState = {
  alpha: 1,
  interactable: true,
  blocksRaycasts: true,
};

/** Combines `inherited` with `entity`'s own `CanvasGroupEcsComponent`, if it has one. */
function combineWithOwnGroup(
  world: EcsWorld,
  entity: number,
  inherited: InheritedCanvasGroupState,
): InheritedCanvasGroupState {
  const group = world.getComponent<CanvasGroupEcsComponent>(
    entity,
    canvasGroupId,
  );

  if (!group) {
    return inherited;
  }

  const base = group.ignoreParentGroups ? identityInheritedState : inherited;

  return {
    alpha: base.alpha * group.alpha,
    interactable: base.interactable && group.interactable,
    blocksRaycasts: base.blocksRaycasts && group.blocksRaycasts,
  };
}

/**
 * Creates a system that walks every `CanvasEcsComponent`'s rect hierarchy
 * top-down (the same hierarchy `createUiLayoutEcsSystem` walks), combining
 * each `CanvasGroupEcsComponent` it passes through with the ones above it,
 * and writes the resulting `alpha` into `SpriteEcsComponent.opacityMultiplier`/
 * `TextEcsComponent.opacityMultiplier` for every element under it - so
 * fading, disabling, or making click-through a whole panel is one
 * component instead of one per element. `interactable`/`blocksRaycasts`
 * are combined the same way but read on demand instead, via
 * `resolveCanvasGroupState` - see `createUiRaycastEcsSystem`/
 * `createUiInteractionEcsSystem`/`createUiNavigationEcsSystem`.
 *
 * An element with no `CanvasGroupEcsComponent` ancestor at all is left with
 * `opacityMultiplier` `undefined` (not `1`) so a plain sprite/text entity
 * with no ancestor canvas group is never touched.
 *
 * Must be registered after `createUiLayoutEcsSystem` (both walk the same
 * hierarchy; group state doesn't depend on resolved rects, but running
 * after keeps every UI system's relative order predictable) and before
 * `createRenderEcsSystem`.
 * @returns The UI canvas group ECS system.
 */
export const createUiCanvasGroupEcsSystem = (): EcsSystem<
  [RectTransformEcsComponent, PositionEcsComponent]
> => ({
  name: 'uiCanvasGroup',
  query: [rectTransformId, positionId],
  update: (world, { entities }) => {
    const elements = new Set(entities);
    const childrenByParent = new Map<number, number[]>();
    const roots: number[] = [];

    for (const entity of entities) {
      const parentComponent = world.getComponent<ParentEcsComponent>(
        entity,
        parentId,
      );

      if (!parentComponent || !elements.has(parentComponent.parent)) {
        roots.push(entity);

        continue;
      }

      let children = childrenByParent.get(parentComponent.parent);

      if (!children) {
        children = [];
        childrenByParent.set(parentComponent.parent, children);
      }

      children.push(entity);
    }

    const visited = new Set<number>();

    const visit = (
      entity: number,
      inherited: InheritedCanvasGroupState,
    ): void => {
      if (visited.has(entity)) {
        return;
      }

      visited.add(entity);

      const state = combineWithOwnGroup(world, entity, inherited);
      const isGoverned = state !== identityInheritedState;

      if (isGoverned) {
        const sprite = world.getComponent<SpriteEcsComponent>(entity, spriteId);

        if (sprite) {
          sprite.opacityMultiplier = state.alpha;
        }

        const text = world.getComponent<TextEcsComponent>(entity, textId);

        if (text) {
          text.opacityMultiplier = state.alpha;
        }
      }

      for (const child of childrenByParent.get(entity) ?? []) {
        visit(child, state);
      }
    };

    for (const root of roots) {
      visit(root, identityInheritedState);
    }
  },
});
