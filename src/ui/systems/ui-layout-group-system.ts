import { ParentEcsComponent, parentId } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Rects } from '../../math/index.js';
import {
  TextEcsComponent,
  textId,
  TextMeshEcsComponent,
  textMeshId,
} from '../../text/index.js';
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

/**
 * A grid cell index's logical (pre-`startCorner`-flip) column/row, derived
 * from `startAxis` - which axis is filled first before wrapping to the next
 * column/row. Sizing (see `computeGridSizing`) is always done in this
 * logical space; only physical placement (see `arrangeGrid`) applies
 * `startCorner`'s flip on top of it.
 */
function logicalCellOf(
  grid: GridLayoutGroupEcsComponent,
  index: number,
  columns: number,
  rows: number,
): { column: number; row: number } {
  if (grid.startAxis === 'horizontal') {
    return { column: index % columns, row: Math.floor(index / columns) };
  }

  return { row: index % rows, column: Math.floor(index / rows) };
}

/** Running offsets into `sizes`, each entry followed by `spacing` - `offsets[i]` is where `sizes[i]` starts. */
function prefixSum(sizes: readonly number[], spacing: number): number[] {
  const offsets: number[] = [];
  let cursor = 0;

  for (const size of sizes) {
    offsets.push(cursor);
    cursor += size + spacing;
  }

  return offsets;
}

interface GridSizing {
  columns: number;
  rows: number;
  /** Each logical column's width - `cellSize.x` on a `'fixed'` axis, the max measured preferred width of its cells on a `'content'` axis. */
  columnWidths: number[];
  /** The row equivalent of `columnWidths`. */
  rowHeights: number[];
  /** Total grid content width: `columnWidths` summed, plus inter-column spacing. */
  width: number;
  /** The height equivalent of `width`. */
  height: number;
}

/**
 * Derives a grid's per-column/row sizes and overall content size. On a
 * `'fixed'` axis every column/row is exactly `cellSize` (today's original
 * behavior); on a `'content'` axis, each column's/row's size is the max
 * measured preferred size among the cells `logicalCellOf` places in it.
 * Shared by `measureGridContent` (which only needs the overall size) and
 * `arrangeGrid` (which also needs the per-column/row sizes to place cells).
 */
function computeGridSizing(
  grid: GridLayoutGroupEcsComponent,
  children: readonly number[],
  measure: Measure,
  innerWidth?: number,
): GridSizing {
  const { columns, rows } = gridDimensions(grid, children.length, innerWidth);

  const columnWidths = new Array<number>(columns).fill(grid.cellSize.x);
  const rowHeights = new Array<number>(rows).fill(grid.cellSize.y);

  if (grid.columnWidthMode === 'content' || grid.rowHeightMode === 'content') {
    for (let i = 0; i < children.length; i++) {
      const { column, row } = logicalCellOf(grid, i, columns, rows);
      const measured = measure(children[i]);

      if (grid.columnWidthMode === 'content') {
        columnWidths[column] = Math.max(
          columnWidths[column],
          measured.width.preferred,
        );
      }

      if (grid.rowHeightMode === 'content') {
        rowHeights[row] = Math.max(rowHeights[row], measured.height.preferred);
      }
    }
  }

  const width =
    columnWidths.reduce((a, b) => a + b, 0) + grid.spacing.x * (columns - 1);
  const height =
    rowHeights.reduce((a, b) => a + b, 0) + grid.spacing.y * (rows - 1);

  return { columns, rows, columnWidths, rowHeights, width, height };
}

/** A grid's own content size: its per-column/row sizes (see `computeGridSizing`), plus spacing and padding. */
function measureGridContent(
  grid: GridLayoutGroupEcsComponent,
  children: readonly number[],
  measure: Measure,
): Measured {
  if (children.length === 0) {
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

  const sizing = computeGridSizing(grid, children, measure);
  const width = sizing.width + grid.padding.left + grid.padding.right;
  const height = sizing.height + grid.padding.top + grid.padding.bottom;

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
 * of those - `RectTransformEcsComponent.sizeOrMargin` as the preferred size (a
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
        arrangeableChildrenOf(world, childrenByParent, entity),
        measure,
      );
    } else if (layoutElement?.sizeToText) {
      const textComponent = world.getComponent<TextEcsComponent>(
        entity,
        textId,
      );

      if (!textComponent) {
        throw new Error(
          `Entity "${entity}" has LayoutElementEcsComponent.sizeToText set but no TextEcsComponent - sizeToText only applies to text entities (e.g. a label created via createLabel).`,
        );
      }

      // TextMeshEcsComponent is only attached once createTextShapingEcsSystem
      // has actually shaped this entity's text, which - depending on
      // registration order relative to createUiLayoutGroupEcsSystem - may
      // not have happened yet for a brand-new entity on the very first tick
      // it exists. Measuring as 0 for that one tick (rather than throwing)
      // matches the one-frame-stale convergence every other freshly-created
      // entity in this system already has; it self-corrects the next tick
      // once shaping runs.
      const textMesh = world.getComponent<TextMeshEcsComponent>(
        entity,
        textMeshId,
      );

      base = {
        width: {
          min: textMesh?.bounds.width ?? 0,
          preferred: textMesh?.bounds.width ?? 0,
          flexible: 0,
        },
        height: {
          min: textMesh?.bounds.height ?? 0,
          preferred: textMesh?.bounds.height ?? 0,
          flexible: 0,
        },
      };
    } else {
      base = {
        width: { min: 0, preferred: rectTransform.sizeOrMargin.x, flexible: 0 },
        height: {
          min: 0,
          preferred: rectTransform.sizeOrMargin.y,
          flexible: 0,
        },
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
    return isHorizontal ? childRect.sizeOrMargin.x : childRect.sizeOrMargin.y;
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
  // `weights` always has at least one entry here (arrangeAxisGroup already
  // returned early for zero children) and every entry is either a positive
  // flexible value or 1, so this sum is always positive.
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  for (let i = 0; i < mainSizes.length; i++) {
    mainSizes[i] += (extraSpace * weights[i]) / totalWeight;
  }
}

/**
 * A child's cross-axis size: force-expanded to fill the whole cross axis
 * (but never shrunk below the child's own measured preferred size - the
 * same "grow, never shrink" floor the main axis's own leftover-space
 * distribution already enforces via its `Math.max(0, ...)` clamp), its own
 * measured preferred size, or its own current size, per the group's
 * control/force-expand flags.
 *
 * The floor matters beyond just "don't shrink": `innerCross` is computed
 * from this group's own rect as of the *previous* frame (`rect` is one
 * frame stale by design - see this file's own system doc comment), which
 * starts at `Rects.zero` for a brand-new entity and so is negative here
 * once padding is subtracted. Without the floor, that transient negative
 * value would get written into the child's own `sizeOrMargin`, which a
 * `ContentSizeFitterEcsComponent` on the *group* elsewhere in this same
 * tree could then measure and feed back into the group's own size next
 * frame - a self-sustaining, permanent oscillation between the corrupted
 * and correct size, never converging, rather than a one-frame hiccup.
 */
function crossSizeOf(
  crossControl: boolean,
  crossForceExpand: boolean,
  innerCross: number,
  crossMeasure: AxisMeasure,
  isHorizontal: boolean,
  childRect: RectTransformEcsComponent,
): number {
  if (!crossControl) {
    return isHorizontal ? childRect.sizeOrMargin.y : childRect.sizeOrMargin.x;
  }

  if (crossForceExpand) {
    return Math.max(crossMeasure.preferred, innerCross);
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
      childRect.sizeOrMargin.x = mainSize;
    } else {
      childRect.sizeOrMargin.y = mainSize;
    }
  }

  if (crossControl) {
    if (isHorizontal) {
      childRect.sizeOrMargin.y = crossSize;
    } else {
      childRect.sizeOrMargin.x = crossSize;
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
 * Arranges one `GridLayoutGroupEcsComponent`'s direct children into cells,
 * per `constraint`/`startAxis`/`startCorner`, with the whole grid block
 * aligned within any leftover content-box space per `childAlignment`. On a
 * `'fixed'` axis (`columnWidthMode`/`rowHeightMode`, the default for both),
 * cell size on that axis never comes from a child's own measured size -
 * every cell is exactly `cellSize`, unchanged from the grid's original
 * behavior. On a `'content'` axis, each column's/row's size instead comes
 * from `computeGridSizing`, and a cell narrower/shorter than its own
 * column/row is offset within it per `cellAlignment`.
 */
function arrangeGrid(
  world: EcsWorld,
  entity: number,
  grid: GridLayoutGroupEcsComponent,
  childrenByParent: Map<number, number[]>,
  measure: Measure,
): void {
  const rectTransform = world.getComponent<RectTransformEcsComponent>(
    entity,
    rectTransformId,
  )!;
  const rectSize = Rects.size(rectTransform.rect);
  const { padding, spacing, childAlignment, cellAlignment } = grid;

  const children = arrangeableChildrenOf(world, childrenByParent, entity);

  if (children.length === 0) {
    return;
  }

  const innerWidth = rectSize.x - padding.left - padding.right;
  const innerHeight = rectSize.y - padding.top - padding.bottom;

  const { columns, rows, columnWidths, rowHeights, width, height } =
    computeGridSizing(grid, children, measure, innerWidth);
  const gridContentWidth = width;
  const gridContentHeight = height;

  const leftoverX = Math.max(0, innerWidth - gridContentWidth);
  const leftoverY = Math.max(0, innerHeight - gridContentHeight);

  const contentLeft = padding.left + leftoverX * childAlignment.x;
  const contentBottom = padding.bottom + leftoverY * childAlignment.y;

  const flipColumn =
    grid.startCorner === 'upperRight' || grid.startCorner === 'lowerRight';
  const flipRow =
    grid.startCorner === 'lowerLeft' || grid.startCorner === 'lowerRight';

  // A flipped grid's physical column/row 0 holds whichever logical
  // column/row ends up there, so the offsets used to place cells (computed
  // over physical order) need the same reversal applied to the logical
  // column/row sizes before the prefix sum runs.
  const physicalColumnWidths = columnWidths.map(
    (_, physical) =>
      columnWidths[flipColumn ? columns - 1 - physical : physical],
  );
  const physicalRowHeights = rowHeights.map(
    (_, physical) => rowHeights[flipRow ? rows - 1 - physical : physical],
  );

  const columnOffsets = prefixSum(physicalColumnWidths, spacing.x);
  const rowOffsets = prefixSum(physicalRowHeights, spacing.y);

  for (let i = 0; i < children.length; i++) {
    const { column, row } = logicalCellOf(grid, i, columns, rows);
    const actualColumn = flipColumn ? columns - 1 - column : column;
    const actualRow = flipRow ? rows - 1 - row : row;

    const columnWidth = columnWidths[column];
    const rowHeight = rowHeights[row];

    const childMeasured = measure(children[i]);
    const cellWidth =
      grid.columnWidthMode === 'content'
        ? childMeasured.width.preferred
        : columnWidth;
    const cellHeight =
      grid.rowHeightMode === 'content'
        ? childMeasured.height.preferred
        : rowHeight;

    const childRect = world.getComponent<RectTransformEcsComponent>(
      children[i],
      rectTransformId,
    )!;

    childRect.anchorMin = { x: 0, y: 0 };
    childRect.anchorMax = { x: 0, y: 0 };
    childRect.pivot = { x: 0, y: 0 };
    childRect.sizeOrMargin = { x: cellWidth, y: cellHeight };

    const offsetX = (columnWidth - cellWidth) * cellAlignment.x;
    const offsetY = (rowHeight - cellHeight) * cellAlignment.y;

    const cellLeft = contentLeft + columnOffsets[actualColumn] + offsetX;
    const cellBottom =
      contentBottom +
      gridContentHeight -
      rowOffsets[actualRow] -
      rowHeight +
      offsetY;

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
    rectTransform.sizeOrMargin.x = measured.width.min;
  } else if (fitter.horizontalFit === 'preferredSize') {
    rectTransform.sizeOrMargin.x = measured.width.preferred;
  }

  if (fitter.verticalFit === 'minSize') {
    rectTransform.sizeOrMargin.y = measured.height.min;
  } else if (fitter.verticalFit === 'preferredSize') {
    rectTransform.sizeOrMargin.y = measured.height.preferred;
  }
}

/**
 * Creates a system that arranges every `HorizontalLayoutGroupEcsComponent`/
 * `VerticalLayoutGroupEcsComponent`/`GridLayoutGroupEcsComponent`'s direct
 * children, and resizes every `ContentSizeFitterEcsComponent`'s own entity
 * to its measured content size - both against `RectTransformEcsComponent.rect`
 * as it stood at the *end of the previous frame*, since this system must run
 * before `createUiLayoutEcsSystem` (the one that resolves `rect` for this
 * frame) so the `sizeOrMargin`/`anchoredPosition` it writes are resolved into
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

    // Measuring is a pure, read-only pass; arranging mutates sizeOrMargin -
    // the very field a plain (non-group) entity's own measure() falls back
    // to reading. Warming the cache for every entity here, before any
    // arrange/fit call below can mutate anything, guarantees every measure()
    // call from this point on is a cache hit rather than a fresh
    // computation - so an entity's measured size always reflects its
    // pre-arrangement state for the rest of this tick, never a sibling
    // group's (or its own) already-mutated one. Skipping this and instead
    // measuring lazily, interleaved with arrangement, self-corrupts for any
    // entity that is both arranged by a group and re-measured later in the
    // same tick (e.g. a ContentSizeFitterEcsComponent on the same entity as
    // the group whose children it measures) - the two disagree on which of
    // two possible sizes is current, oscillating between them forever
    // rather than converging.
    for (const entity of entities) {
      measure(entity);
    }

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
        arrangeGrid(world, entity, gridGroup, childrenByParent, measure);
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
