import { ParentEcsComponent, parentId } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Rects } from '../../math/index.js';
import {
  ContentSizeFitterEcsComponent,
  contentSizeFitterId,
} from '../components/content-size-fitter-component.js';
import {
  LayoutElementEcsComponent,
  layoutElementId,
} from '../components/layout-element-component.js';
import {
  GridLayoutGroupEcsComponent,
  gridLayoutGroupId,
  UiAxisLayoutGroupEcsComponent,
  uiAxisLayoutGroupId,
  UiLayoutGroupPadding,
} from '../components/layout-group-component.js';
import {
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';

interface AxisMeasure {
  min: number;
  preferred: number;
  flexible: number;
}

interface Measured {
  width: AxisMeasure;
  height: AxisMeasure;
}

type Measure = (entity: number) => Measured;

function isIgnored(world: EcsWorld, entity: number): boolean {
  return (
    world.getComponent<LayoutElementEcsComponent>(entity, layoutElementId)
      ?.ignoreLayout === true
  );
}

/** A group's (or fitter's) direct children, in query order, minus any `ignoreLayout` ones. */
function arrangeableChildrenOf(
  world: EcsWorld,
  childrenByParent: Map<number, number[]>,
  entity: number,
): number[] {
  return (childrenByParent.get(entity) ?? []).filter(
    (child) => !isIgnored(world, child),
  );
}

/**
 * Decides a grid's column/row count from its `constraint`. `innerWidth`
 * (the content box width available to fit columns into) is only relevant
 * to the `flexible` constraint; when it's not yet known (measuring a grid
 * as a nested layout element, rather than arranging its actual cells), a
 * single row of `childCount` columns stands in - a fallback that's only
 * ever used as one group's contribution to a parent's own measured size,
 * never to actually place cells.
 */
function gridDimensions(
  grid: GridLayoutGroupEcsComponent,
  childCount: number,
  innerWidth: number | undefined,
): { columns: number; rows: number } {
  if (grid.constraint === 'fixedColumnCount') {
    const columns = Math.max(1, grid.constraintCount);

    return { columns, rows: Math.ceil(childCount / columns) };
  }

  if (grid.constraint === 'fixedRowCount') {
    const rows = Math.max(1, grid.constraintCount);

    return { columns: Math.ceil(childCount / rows), rows };
  }

  if (innerWidth === undefined) {
    return { columns: childCount, rows: 1 };
  }

  const columns = Math.max(
    1,
    Math.floor(
      (innerWidth + grid.spacing.x) / (grid.cellSize.x + grid.spacing.x),
    ),
  );

  return { columns, rows: Math.ceil(childCount / columns) };
}

/** A horizontal/vertical group's own content size: children summed along the main axis, maxed along the cross axis, plus padding. */
function measureAxisGroupContent(
  world: EcsWorld,
  entity: number,
  group: UiAxisLayoutGroupEcsComponent,
  childrenByParent: Map<number, number[]>,
  measure: Measure,
): Measured {
  const { padding } = group;
  const isHorizontal = group.direction === 'horizontal';
  const mainPadding = isHorizontal
    ? padding.left + padding.right
    : padding.top + padding.bottom;
  const crossPadding = isHorizontal
    ? padding.top + padding.bottom
    : padding.left + padding.right;

  const children = arrangeableChildrenOf(world, childrenByParent, entity);

  if (children.length === 0) {
    const mainAxis: AxisMeasure = {
      min: mainPadding,
      preferred: mainPadding,
      flexible: 0,
    };
    const crossAxis: AxisMeasure = {
      min: crossPadding,
      preferred: crossPadding,
      flexible: 0,
    };

    return isHorizontal
      ? { width: mainAxis, height: crossAxis }
      : { width: crossAxis, height: mainAxis };
  }

  const measures = children.map(measure);
  const totalSpacing = group.spacing * (children.length - 1);

  const mainOf = (measured: Measured): AxisMeasure =>
    isHorizontal ? measured.width : measured.height;
  const crossOf = (measured: Measured): AxisMeasure =>
    isHorizontal ? measured.height : measured.width;

  const mainAxis: AxisMeasure = {
    min:
      measures.reduce((sum, m) => sum + mainOf(m).min, 0) +
      totalSpacing +
      mainPadding,
    preferred:
      measures.reduce((sum, m) => sum + mainOf(m).preferred, 0) +
      totalSpacing +
      mainPadding,
    flexible: 0,
  };

  const crossAxis: AxisMeasure = {
    min: Math.max(...measures.map((m) => crossOf(m).min)) + crossPadding,
    preferred:
      Math.max(...measures.map((m) => crossOf(m).preferred)) + crossPadding,
    flexible: 0,
  };

  return isHorizontal
    ? { width: mainAxis, height: crossAxis }
    : { width: crossAxis, height: mainAxis };
}

/** A grid's own content size: its column/row count (see `gridDimensions`) times `cellSize`, plus spacing and padding. */
function measureGridContent(
  grid: GridLayoutGroupEcsComponent,
  childCount: number,
): Measured {
  if (childCount === 0) {
    const width: AxisMeasure = {
      min: grid.padding.left + grid.padding.right,
      preferred: grid.padding.left + grid.padding.right,
      flexible: 0,
    };
    const height: AxisMeasure = {
      min: grid.padding.top + grid.padding.bottom,
      preferred: grid.padding.top + grid.padding.bottom,
      flexible: 0,
    };

    return { width, height };
  }

  const { columns, rows } = gridDimensions(grid, childCount, undefined);
  const width =
    columns * grid.cellSize.x +
    (columns - 1) * grid.spacing.x +
    grid.padding.left +
    grid.padding.right;
  const height =
    rows * grid.cellSize.y +
    (rows - 1) * grid.spacing.y +
    grid.padding.top +
    grid.padding.bottom;

  return {
    width: { min: width, preferred: width, flexible: 0 },
    height: { min: height, preferred: height, flexible: 0 },
  };
}

/**
 * Builds a memoized `measure` function reporting an entity's own
 * min/preferred/flexible size on each axis: a `HorizontalLayoutGroupEcsComponent`/
 * `VerticalLayoutGroupEcsComponent`/`GridLayoutGroupEcsComponent`'s own
 * content size (recursing into its own children, bottom-up), or - with none
 * of those - `RectTransformEcsComponent.sizeDelta` as the preferred size (a
 * min of `0`, a flexible weight of `0`). A `LayoutElementEcsComponent`
 * overrides individual fields on top of either source. Results are cached
 * per entity for the lifetime of one `update` call, so a group nested
 * inside another is only measured once regardless of how many ancestors
 * ask.
 */
function createMeasure(
  world: EcsWorld,
  childrenByParent: Map<number, number[]>,
): Measure {
  const cache = new Map<number, Measured>();

  const measure: Measure = (entity) => {
    const cached = cache.get(entity);

    if (cached) {
      return cached;
    }

    const rectTransform = world.getComponent<RectTransformEcsComponent>(
      entity,
      rectTransformId,
    )!;
    const layoutElement = world.getComponent<LayoutElementEcsComponent>(
      entity,
      layoutElementId,
    );
    const axisGroup = world.getComponent<UiAxisLayoutGroupEcsComponent>(
      entity,
      uiAxisLayoutGroupId,
    );
    const gridGroup = world.getComponent<GridLayoutGroupEcsComponent>(
      entity,
      gridLayoutGroupId,
    );

    let base: Measured;

    if (axisGroup) {
      base = measureAxisGroupContent(
        world,
        entity,
        axisGroup,
        childrenByParent,
        measure,
      );
    } else if (gridGroup) {
      base = measureGridContent(
        gridGroup,
        arrangeableChildrenOf(world, childrenByParent, entity).length,
      );
    } else {
      base = {
        width: { min: 0, preferred: rectTransform.sizeDelta.x, flexible: 0 },
        height: { min: 0, preferred: rectTransform.sizeDelta.y, flexible: 0 },
      };
    }

    const result: Measured = {
      width: {
        min: layoutElement?.minWidth ?? base.width.min,
        preferred: layoutElement?.preferredWidth ?? base.width.preferred,
        flexible: layoutElement?.flexibleWidth ?? base.width.flexible,
      },
      height: {
        min: layoutElement?.minHeight ?? base.height.min,
        preferred: layoutElement?.preferredHeight ?? base.height.preferred,
        flexible: layoutElement?.flexibleHeight ?? base.height.flexible,
      },
    };

    cache.set(entity, result);

    return result;
  };

  return measure;
}

/** A child's starting main-axis size: its measured preferred size when controlled, otherwise its own current size on that axis. */
function initialMainSize(
  mainControl: boolean,
  isHorizontal: boolean,
  mainMeasure: AxisMeasure,
  childRect: RectTransformEcsComponent,
): number {
  if (!mainControl) {
    return isHorizontal ? childRect.sizeDelta.x : childRect.sizeDelta.y;
  }

  return mainMeasure.preferred;
}

/**
 * Distributes `extraSpace` (the content box's main axis, minus every
 * child's own summed preferred size and spacing) across `mainSizes` in
 * place, weighted by each child's `flexible` value from `mainMeasures` (or
 * evenly, if none of them set one).
 */
function distributeExtraSpace(
  mainMeasures: readonly AxisMeasure[],
  mainSizes: number[],
  extraSpace: number,
): void {
  if (extraSpace <= 0) {
    return;
  }

  const totalFlexible = mainMeasures.reduce((sum, m) => sum + m.flexible, 0);
  const weights = mainMeasures.map((m) => (totalFlexible > 0 ? m.flexible : 1));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight <= 0) {
    return;
  }

  for (let i = 0; i < mainSizes.length; i++) {
    mainSizes[i] += (extraSpace * weights[i]) / totalWeight;
  }
}

/** A child's cross-axis size: force-expanded to fill the whole cross axis, its own measured preferred size, or its own current size, per the group's control/force-expand flags. */
function crossSizeOf(
  crossControl: boolean,
  crossForceExpand: boolean,
  innerCross: number,
  crossMeasure: AxisMeasure,
  isHorizontal: boolean,
  childRect: RectTransformEcsComponent,
): number {
  if (!crossControl) {
    return isHorizontal ? childRect.sizeDelta.y : childRect.sizeDelta.x;
  }

  if (crossForceExpand) {
    return innerCross;
  }

  return crossMeasure.preferred;
}

/** Options for {@link placeChild}, grouped to stay within this codebase's parameter-count limit. */
interface PlaceChildOptions {
  childRect: RectTransformEcsComponent;
  isHorizontal: boolean;
  mainControl: boolean;
  crossControl: boolean;
  mainSize: number;
  crossSize: number;
  blockStart: number;
  cursor: number;
  padding: UiLayoutGroupPadding;
  crossOffset: number;
}

/**
 * Writes one arranged child's final anchor/pivot, size, and position. Every
 * arranged child is forced to a bottom-left point anchor/pivot (`anchorMin =
 * anchorMax = pivot = {0, 0}`) regardless of its previous anchoring, since
 * the group positions it via `anchoredPosition` measured from its own
 * content box's bottom-left corner.
 */
function placeChild(options: PlaceChildOptions): void {
  const {
    childRect,
    isHorizontal,
    mainControl,
    crossControl,
    mainSize,
    crossSize,
    blockStart,
    cursor,
    padding,
    crossOffset,
  } = options;

  childRect.anchorMin = { x: 0, y: 0 };
  childRect.anchorMax = { x: 0, y: 0 };
  childRect.pivot = { x: 0, y: 0 };

  if (mainControl) {
    if (isHorizontal) {
      childRect.sizeDelta.x = mainSize;
    } else {
      childRect.sizeDelta.y = mainSize;
    }
  }

  if (crossControl) {
    if (isHorizontal) {
      childRect.sizeDelta.y = crossSize;
    } else {
      childRect.sizeDelta.x = crossSize;
    }
  }

  childRect.anchoredPosition = isHorizontal
    ? { x: blockStart + cursor, y: padding.bottom + crossOffset }
    : { x: padding.left + crossOffset, y: blockStart - cursor - mainSize };
}

/**
 * Arranges one `HorizontalLayoutGroupEcsComponent`/`VerticalLayoutGroupEcsComponent`'s
 * direct children along its main axis (spaced, and - with `childControlWidth`/
 * `childControlHeight` and `childForceExpandWidth`/`childForceExpandHeight` -
 * resized to fill any leftover space), and aligned individually within its
 * cross axis, per `group.childAlignment`. See `placeChild` for the final
 * anchor/pivot every arranged child is forced to.
 */
function arrangeAxisGroup(
  world: EcsWorld,
  entity: number,
  group: UiAxisLayoutGroupEcsComponent,
  childrenByParent: Map<number, number[]>,
  measure: Measure,
): void {
  const rectTransform = world.getComponent<RectTransformEcsComponent>(
    entity,
    rectTransformId,
  )!;
  const rectSize = Rects.size(rectTransform.rect);
  const { padding, spacing, childAlignment } = group;
  const isHorizontal = group.direction === 'horizontal';

  const children = arrangeableChildrenOf(world, childrenByParent, entity);

  if (children.length === 0) {
    return;
  }

  const innerWidth = rectSize.x - padding.left - padding.right;
  const innerHeight = rectSize.y - padding.top - padding.bottom;
  const innerMain = isHorizontal ? innerWidth : innerHeight;
  const innerCross = isHorizontal ? innerHeight : innerWidth;

  const mainControl = isHorizontal
    ? group.childControlWidth
    : group.childControlHeight;
  const crossControl = isHorizontal
    ? group.childControlHeight
    : group.childControlWidth;
  const mainForceExpand = isHorizontal
    ? group.childForceExpandWidth
    : group.childForceExpandHeight;
  // Unlike the main axis (where force-expand distributes only the leftover
  // space beyond every child's own summed preferred size), the cross axis
  // has one child per "row", so its own force-expand flag - named for the
  // literal width/height it controls, not main/cross - simply stretches
  // every child to fill the whole cross axis outright.
  const crossForceExpand = isHorizontal
    ? group.childForceExpandHeight
    : group.childForceExpandWidth;

  const childRects = children.map((child) =>
    world.getComponent<RectTransformEcsComponent>(child, rectTransformId)!,
  );
  const measures = children.map(measure);
  const mainMeasures = measures.map((m) => (isHorizontal ? m.width : m.height));
  const crossMeasures = measures.map((m) =>
    isHorizontal ? m.height : m.width,
  );

  const childMainSizes = children.map((_, i) =>
    initialMainSize(mainControl, isHorizontal, mainMeasures[i], childRects[i]),
  );

  const totalSpacing = spacing * (children.length - 1);
  const totalPreferredMain =
    childMainSizes.reduce((a, b) => a + b, 0) + totalSpacing;
  const extraSpace = Math.max(0, innerMain - totalPreferredMain);

  if (mainForceExpand && mainControl) {
    distributeExtraSpace(mainMeasures, childMainSizes, extraSpace);
  }

  const contentMain = childMainSizes.reduce((a, b) => a + b, 0) + totalSpacing;
  const leftoverMain = Math.max(0, innerMain - contentMain);
  const mainAlignment = isHorizontal ? childAlignment.x : childAlignment.y;
  const crossAlignment = isHorizontal ? childAlignment.y : childAlignment.x;

  const blockStart = isHorizontal
    ? padding.left + leftoverMain * mainAlignment
    : padding.bottom + leftoverMain * mainAlignment + contentMain;

  let cursor = 0;

  for (let i = 0; i < children.length; i++) {
    const mainSize = childMainSizes[i];
    const crossSize = crossSizeOf(
      crossControl,
      crossForceExpand,
      innerCross,
      crossMeasures[i],
      isHorizontal,
      childRects[i],
    );
    const crossOffset = (innerCross - crossSize) * crossAlignment;

    placeChild({
      childRect: childRects[i],
      isHorizontal,
      mainControl,
      crossControl,
      mainSize,
      crossSize,
      blockStart,
      cursor,
      padding,
      crossOffset,
    });

    cursor += mainSize + spacing;
  }
}

/**
 * Arranges one `GridLayoutGroupEcsComponent`'s direct children into fixed
 * `cellSize` cells, per `constraint`/`startAxis`/`startCorner`, with the
 * whole grid block aligned within any leftover content-box space per
 * `childAlignment`. Unlike an axis group, cell size never comes from a
 * child's own measured size.
 */
function arrangeGrid(
  world: EcsWorld,
  entity: number,
  grid: GridLayoutGroupEcsComponent,
  childrenByParent: Map<number, number[]>,
): void {
  const rectTransform = world.getComponent<RectTransformEcsComponent>(
    entity,
    rectTransformId,
  )!;
  const rectSize = Rects.size(rectTransform.rect);
  const { padding, cellSize, spacing, childAlignment } = grid;

  const children = arrangeableChildrenOf(world, childrenByParent, entity);

  if (children.length === 0) {
    return;
  }

  const innerWidth = rectSize.x - padding.left - padding.right;
  const innerHeight = rectSize.y - padding.top - padding.bottom;

  const { columns, rows } = gridDimensions(grid, children.length, innerWidth);

  const gridContentWidth = columns * cellSize.x + (columns - 1) * spacing.x;
  const gridContentHeight = rows * cellSize.y + (rows - 1) * spacing.y;

  const leftoverX = Math.max(0, innerWidth - gridContentWidth);
  const leftoverY = Math.max(0, innerHeight - gridContentHeight);

  const contentLeft = padding.left + leftoverX * childAlignment.x;
  const contentBottom = padding.bottom + leftoverY * childAlignment.y;

  const flipColumn =
    grid.startCorner === 'upperRight' || grid.startCorner === 'lowerRight';
  const flipRow =
    grid.startCorner === 'lowerLeft' || grid.startCorner === 'lowerRight';

  for (let i = 0; i < children.length; i++) {
    let row: number;
    let column: number;

    if (grid.startAxis === 'horizontal') {
      column = i % columns;
      row = Math.floor(i / columns);
    } else {
      row = i % rows;
      column = Math.floor(i / rows);
    }

    const actualColumn = flipColumn ? columns - 1 - column : column;
    const actualRow = flipRow ? rows - 1 - row : row;

    const childRect = world.getComponent<RectTransformEcsComponent>(
      children[i],
      rectTransformId,
    )!;

    childRect.anchorMin = { x: 0, y: 0 };
    childRect.anchorMax = { x: 0, y: 0 };
    childRect.pivot = { x: 0, y: 0 };
    childRect.sizeDelta = { x: cellSize.x, y: cellSize.y };

    const cellLeft = contentLeft + actualColumn * (cellSize.x + spacing.x);
    const rowFromTop = actualRow * (cellSize.y + spacing.y);
    const cellBottom =
      contentBottom + gridContentHeight - rowFromTop - cellSize.y;

    childRect.anchoredPosition = { x: cellLeft, y: cellBottom };
  }
}

/** Resizes a `ContentSizeFitterEcsComponent`'s own entity to its measured content size, per axis. */
function applyContentSizeFitter(
  world: EcsWorld,
  entity: number,
  fitter: ContentSizeFitterEcsComponent,
  measure: Measure,
): void {
  if (
    fitter.horizontalFit === 'unconstrained' &&
    fitter.verticalFit === 'unconstrained'
  ) {
    return;
  }

  const rectTransform = world.getComponent<RectTransformEcsComponent>(
    entity,
    rectTransformId,
  )!;
  const measured = measure(entity);

  if (fitter.horizontalFit === 'minSize') {
    rectTransform.sizeDelta.x = measured.width.min;
  } else if (fitter.horizontalFit === 'preferredSize') {
    rectTransform.sizeDelta.x = measured.width.preferred;
  }

  if (fitter.verticalFit === 'minSize') {
    rectTransform.sizeDelta.y = measured.height.min;
  } else if (fitter.verticalFit === 'preferredSize') {
    rectTransform.sizeDelta.y = measured.height.preferred;
  }
}

/**
 * Creates a system that arranges every `HorizontalLayoutGroupEcsComponent`/
 * `VerticalLayoutGroupEcsComponent`/`GridLayoutGroupEcsComponent`'s direct
 * children, and resizes every `ContentSizeFitterEcsComponent`'s own entity
 * to its measured content size - both against `RectTransformEcsComponent.rect`
 * as it stood at the *end of the previous frame*, since this system must run
 * before `createUiLayoutEcsSystem` (the one that resolves `rect` for this
 * frame) so the `sizeDelta`/`anchoredPosition` it writes are resolved into
 * an up-to-date rect the same tick. This means a group whose own size just
 * changed (a fresh entity, a `ContentSizeFitterEcsComponent` reacting to a
 * child that changed size, a group nested inside another) arranges its
 * children against a one-frame-stale box; like the rest of this module's
 * full-recompute-every-frame approach (see `createUiLayoutEcsSystem`'s own
 * doc comment), this converges within a frame or two rather than being
 * tracked with dirty state.
 *
 * Must be registered before `createUiLayoutEcsSystem`.
 * @returns The UI layout group ECS system.
 */
export const createUiLayoutGroupEcsSystem = (): EcsSystem<
  [RectTransformEcsComponent]
> => ({
  name: 'uiLayoutGroup',
  query: [rectTransformId],
  update: (world, { entities }) => {
    const rectTransformEntities = new Set(entities);
    const childrenByParent = new Map<number, number[]>();

    for (const entity of entities) {
      const parentComponent = world.getComponent<ParentEcsComponent>(
        entity,
        parentId,
      );

      if (
        !parentComponent ||
        !rectTransformEntities.has(parentComponent.parent)
      ) {
        continue;
      }

      let children = childrenByParent.get(parentComponent.parent);

      if (!children) {
        children = [];
        childrenByParent.set(parentComponent.parent, children);
      }

      children.push(entity);
    }

    const measure = createMeasure(world, childrenByParent);

    for (const entity of entities) {
      const axisGroup = world.getComponent<UiAxisLayoutGroupEcsComponent>(
        entity,
        uiAxisLayoutGroupId,
      );

      if (axisGroup) {
        arrangeAxisGroup(world, entity, axisGroup, childrenByParent, measure);

        continue;
      }

      const gridGroup = world.getComponent<GridLayoutGroupEcsComponent>(
        entity,
        gridLayoutGroupId,
      );

      if (gridGroup) {
        arrangeGrid(world, entity, gridGroup, childrenByParent);
      }
    }

    for (const entity of entities) {
      const fitter = world.getComponent<ContentSizeFitterEcsComponent>(
        entity,
        contentSizeFitterId,
      );

      if (fitter) {
        applyContentSizeFitter(world, entity, fitter, measure);
      }
    }
  },
});
