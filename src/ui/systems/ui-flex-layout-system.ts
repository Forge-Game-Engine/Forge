import { parentId } from '../../common/components/parent-component.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  UiFlexEcsComponent,
  uiFlexId,
  UiFlexJustify,
} from '../components/ui-flex-component.js';
import {
  UiTransformEcsComponent,
  uiTransformId,
} from '../components/ui-transform-component.js';
import { computeUiWorldMatrix } from './ui-layout-system.js';

/**
 * Scratch buffer reused each frame to hold all entities that have both a
 * `parentId` and a `uiTransformId`.
 */
const childCandidateBuffer: number[] = [];

/**
 * Map from flex-parent entity id to the list of its direct children that have
 * `UiTransformEcsComponent`. Rebuilt each frame in `beforeQuery`.
 */
const flexChildrenMap = new Map<number, number[]>();

function resolveMainCursor(
  justify: UiFlexJustify,
  padding: number,
  remainingSpace: number,
): number {
  if (justify === 'center') {
    return padding + remainingSpace / 2;
  }

  if (justify === 'end') {
    return padding + remainingSpace;
  }

  return padding;
}

function resolveCrossOffset(
  align: UiFlexEcsComponent['align'],
  padding: number,
  innerCrossSize: number,
  childCross: number,
): number {
  if (align === 'center') {
    return padding + (innerCrossSize - childCross) / 2;
  }

  if (align === 'end') {
    return padding + innerCrossSize - childCross;
  }

  return padding;
}

interface PositionChildContext {
  align: UiFlexEcsComponent['align'];
  innerCrossSize: number;
}

function positionChild(
  childTransform: UiTransformEcsComponent,
  isRow: boolean,
  originX: number,
  originY: number,
  mainCursor: number,
  crossOffset: number,
  ctx: PositionChildContext,
): void {
  if (isRow) {
    childTransform.resolvedRect.origin.x = originX + mainCursor;
    childTransform.resolvedRect.origin.y = originY + crossOffset;

    if (ctx.align === 'stretch') {
      childTransform.resolvedRect.size.y = ctx.innerCrossSize;
    }
  } else {
    childTransform.resolvedRect.origin.x = originX + crossOffset;
    childTransform.resolvedRect.origin.y = originY + mainCursor;

    if (ctx.align === 'stretch') {
      childTransform.resolvedRect.size.x = ctx.innerCrossSize;
    }
  }

  computeUiWorldMatrix(childTransform);
}

function applyFlexLayout(
  parentTransform: UiTransformEcsComponent,
  flex: UiFlexEcsComponent,
  children: readonly number[],
  world: EcsWorld,
): void {
  const { direction, gap, justify, align, padding } = flex;
  const { origin, size } = parentTransform.resolvedRect;

  const isRow = direction === 'row';
  const innerMainSize = (isRow ? size.x : size.y) - padding * 2;
  const innerCrossSize = (isRow ? size.y : size.x) - padding * 2;

  const childTransforms: UiTransformEcsComponent[] = [];
  let totalChildMainSize = 0;

  for (const childEntity of children) {
    const childTransform = world.getComponent(childEntity, uiTransformId);

    if (!childTransform) {
      continue;
    }

    childTransforms.push(childTransform);
    totalChildMainSize += isRow
      ? childTransform.resolvedRect.size.x
      : childTransform.resolvedRect.size.y;
  }

  if (childTransforms.length === 0) {
    return;
  }

  const totalGap = gap * (childTransforms.length - 1);
  const remainingSpace = innerMainSize - totalChildMainSize - totalGap;

  let mainCursor = resolveMainCursor(justify, padding, remainingSpace);

  const spaceBetweenGap =
    justify === 'space-between' && childTransforms.length > 1
      ? remainingSpace / (childTransforms.length - 1)
      : 0;

  for (const childTransform of childTransforms) {
    const childMain = isRow
      ? childTransform.resolvedRect.size.x
      : childTransform.resolvedRect.size.y;
    const childCross = isRow
      ? childTransform.resolvedRect.size.y
      : childTransform.resolvedRect.size.x;

    const crossOffset = resolveCrossOffset(
      align,
      padding,
      innerCrossSize,
      childCross,
    );

    positionChild(
      childTransform,
      isRow,
      origin.x,
      origin.y,
      mainCursor,
      crossOffset,
      {
        align,
        innerCrossSize,
      },
    );

    mainCursor += childMain + gap + spaceBetweenGap;
  }
}

type FlexLayoutSystem = EcsSystem<
  [UiFlexEcsComponent, UiTransformEcsComponent],
  void
>;

/**
 * Creates the experimental flex layout system.
 *
 * This system runs **after** {@link createUiLayoutEcsSystem} and overrides the
 * `resolvedRect` of children whose parent has a {@link UiFlexEcsComponent}.
 * Children are positioned by flow rather than by their anchor settings.
 *
 * @experimental F1.5 flex layout. Isolated behind `UiFlexEcsComponent` so the
 * anchor model is fully usable without it. Register this system after the main
 * layout system using a higher registration order.
 *
 * @returns The flex layout ECS system.
 */
export const createUiFlexLayoutEcsSystem = (): FlexLayoutSystem => ({
  query: [uiFlexId, uiTransformId],

  beforeQuery: (world) => {
    flexChildrenMap.clear();

    world.queryEntities([parentId, uiTransformId], childCandidateBuffer);

    for (const childEntity of childCandidateBuffer) {
      const parent = world.getComponent(childEntity, parentId);

      if (!parent) {
        continue;
      }

      const parentFlex = world.getComponent(parent.parent, uiFlexId);

      if (!parentFlex) {
        continue;
      }

      let children = flexChildrenMap.get(parent.parent);

      if (!children) {
        children = [];
        flexChildrenMap.set(parent.parent, children);
      }

      children.push(childEntity);
    }
  },

  run: (result, world) => {
    const [flex, parentTransform] = result.components;
    const children = flexChildrenMap.get(result.entity);

    if (!children || children.length === 0) {
      return;
    }

    applyFlexLayout(parentTransform, flex, children, world);
  },
});
