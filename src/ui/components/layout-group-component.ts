import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { UiAlignment, uiAlignments } from '../types/ui-alignment.js';

/**
 * Inset, in reference pixels, between a layout group's own resolved rect and
 * the content box its children are measured/arranged within.
 */
export interface UiLayoutGroupPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const zeroPadding: UiLayoutGroupPadding = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

/**
 * Clones a padding value. `zeroPadding` and every `UiAlignment` preset are
 * shared, module-level objects - cloning keeps one entity's group from
 * mutating another's (or a shared preset's) padding/alignment in place.
 */
function clonePadding(padding: UiLayoutGroupPadding): UiLayoutGroupPadding {
  return { ...padding };
}

/**
 * Fields shared by `HorizontalLayoutGroupEcsComponent` and
 * `VerticalLayoutGroupEcsComponent`, with a sensible default; callers may
 * omit these.
 */
export interface UiAxisLayoutGroupDefaultedOptions {
  /** Inset between this group's rect and the content box its children fill. */
  padding: UiLayoutGroupPadding;

  /** Gap, in reference pixels, between adjacent children along the main axis. */
  spacing: number;

  /**
   * Where children (as a block, along the main axis; individually, along
   * the cross axis) sit within any leftover space after their own sizes and
   * spacing are subtracted from the content box. See `uiAlignments` for
   * presets.
   */
  childAlignment: UiAlignment;

  /**
   * Whether this group resizes each child's width - to its measured
   * preferred size, plus a share of any leftover horizontal space if
   * `childForceExpandWidth` is also set. `false` leaves a child's own
   * width untouched; the group still positions it.
   */
  childControlWidth: boolean;

  /** The height equivalent of `childControlWidth`. */
  childControlHeight: boolean;

  /**
   * With `childControlWidth` also set: on the main axis (a horizontal
   * group's width), distributes any leftover space - content box width
   * minus the sum of every child's own preferred width and inter-child
   * spacing - across children, weighted by each child's
   * `LayoutElementEcsComponent.flexibleWidth` (or evenly, if none of them
   * set one). On the cross axis (a vertical group's width), simply
   * stretches every child to the content box's full width, ignoring its
   * own preferred width entirely.
   */
  childForceExpandWidth: boolean;

  /** The height equivalent of `childForceExpandWidth` (main axis for a vertical group, cross axis for a horizontal one). */
  childForceExpandHeight: boolean;
}

/**
 * ECS-style component interface for a horizontal or vertical layout group -
 * `direction` is set by `addHorizontalLayoutGroupComponent`/
 * `addVerticalLayoutGroupComponent` and picks which axis
 * `createUiLayoutGroupEcsSystem` treats as the "main" (arranged, spaced)
 * axis versus the "cross" (aligned) axis.
 */
export interface UiAxisLayoutGroupEcsComponent extends UiAxisLayoutGroupDefaultedOptions {
  readonly direction: 'horizontal' | 'vertical';
}

export const uiAxisLayoutGroupId =
  createComponentId<UiAxisLayoutGroupEcsComponent>('uiAxisLayoutGroup');

const defaultUiAxisLayoutGroupOptions: UiAxisLayoutGroupDefaultedOptions = {
  padding: zeroPadding,
  spacing: 0,
  childAlignment: uiAlignments.topLeft,
  childControlWidth: true,
  childControlHeight: true,
  childForceExpandWidth: true,
  childForceExpandHeight: true,
};

/**
 * Attaches a `HorizontalLayoutGroupEcsComponent` (a `UiAxisLayoutGroupEcsComponent`
 * arranging children left-to-right) to `entity`. `createUiLayoutGroupEcsSystem`
 * arranges every direct child that has a `RectTransformEcsComponent` and
 * whose `LayoutElementEcsComponent.ignoreLayout` (if present) isn't `true`,
 * along the entity's own content box (its resolved rect, inset by
 * `padding`) - each child's height is the group's cross axis, sized/aligned
 * per `childControlHeight`/`childAlignment.y`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to. Its own
 * `RectTransformEcsComponent` supplies the group's content box - add one
 * first if `entity` doesn't already have one (e.g. via `createPanel`).
 * @param options - Options for configuring the group.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addHorizontalLayoutGroupComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<UiAxisLayoutGroupDefaultedOptions> = {},
): UiAxisLayoutGroupEcsComponent {
  const merged = { ...defaultUiAxisLayoutGroupOptions, ...options };
  const component: UiAxisLayoutGroupEcsComponent = {
    ...merged,
    padding: clonePadding(merged.padding),
    childAlignment: Vec2.clone(merged.childAlignment),
    direction: 'horizontal',
  };

  return world.addComponent(entity, uiAxisLayoutGroupId, component);
}

/**
 * Attaches a `VerticalLayoutGroupEcsComponent` (a `UiAxisLayoutGroupEcsComponent`
 * arranging children top-to-bottom) to `entity`. Otherwise identical to
 * {@link addHorizontalLayoutGroupComponent}, with the main/cross axes
 * swapped - width is the cross axis, sized/aligned per
 * `childControlWidth`/`childAlignment.x`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to. Its own
 * `RectTransformEcsComponent` supplies the group's content box - add one
 * first if `entity` doesn't already have one (e.g. via `createPanel`).
 * @param options - Options for configuring the group.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addVerticalLayoutGroupComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<UiAxisLayoutGroupDefaultedOptions> = {},
): UiAxisLayoutGroupEcsComponent {
  const merged = { ...defaultUiAxisLayoutGroupOptions, ...options };
  const component: UiAxisLayoutGroupEcsComponent = {
    ...merged,
    padding: clonePadding(merged.padding),
    childAlignment: Vec2.clone(merged.childAlignment),
    direction: 'vertical',
  };

  return world.addComponent(entity, uiAxisLayoutGroupId, component);
}

/**
 * How a `GridLayoutGroupEcsComponent` decides its column/row count.
 * `flexible` fits as many columns as the content box's width allows;
 * `fixedColumnCount`/`fixedRowCount` hold one axis at `constraintCount` and
 * derive the other from the child count.
 */
export type UiGridLayoutGroupConstraint =
  'flexible' | 'fixedColumnCount' | 'fixedRowCount';

/** Which corner a `GridLayoutGroupEcsComponent` starts placing cells from. */
export type UiGridLayoutGroupCorner =
  'upperLeft' | 'upperRight' | 'lowerLeft' | 'lowerRight';

/** Which axis a `GridLayoutGroupEcsComponent` fills first before wrapping. */
export type UiGridLayoutGroupAxis = 'horizontal' | 'vertical';

/**
 * How a `GridLayoutGroupEcsComponent` sizes one axis's columns/rows: `'fixed'`
 * uses `cellSize` for every column/row, unchanged from the grid's original
 * behavior; `'content'` derives each column's width (or row's height) from
 * the largest measured preferred size among the cells that land in it - the
 * same way an HTML `<table>` auto-sizes its columns.
 */
export type UiGridSizingMode = 'fixed' | 'content';

/**
 * Fields of {@link GridLayoutGroupEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface GridLayoutGroupDefaultedOptions {
  /** Inset between this group's rect and the content box its cells fill. */
  padding: UiLayoutGroupPadding;

  /**
   * Every cell's fixed size - unlike an axis layout group, a grid never
   * measures its children; each simply occupies one `cellSize`-sized cell.
   */
  cellSize: Vector2;

  /** Gap, in reference pixels, between adjacent cells on each axis. */
  spacing: Vector2;

  /** Where the whole grid block sits within any leftover content-box space. */
  childAlignment: UiAlignment;

  /** Which corner cell index `0` starts from. */
  startCorner: UiGridLayoutGroupCorner;

  /** Which axis is filled first (columns, then wrapping to a new row, or vice versa). */
  startAxis: UiGridLayoutGroupAxis;

  /** How the column/row count is decided. */
  constraint: UiGridLayoutGroupConstraint;

  /**
   * The fixed column (or row) count when `constraint` is
   * `fixedColumnCount`/`fixedRowCount`. Unused for `flexible`.
   */
  constraintCount: number;

  /**
   * Derives every column's width from the largest measured preferred width
   * among the cells placed in it, instead of `cellSize.x`. Requires
   * `constraint` to be `fixedColumnCount` or `fixedRowCount` -
   * `addGridLayoutGroupComponent` throws for `'flexible'`, since a flexible
   * grid's column count itself depends on column width, which would depend
   * on column count. Defaults to `'fixed'`.
   */
  columnWidthMode: UiGridSizingMode;

  /** The height/row equivalent of `columnWidthMode`. Defaults to `'fixed'`. */
  rowHeightMode: UiGridSizingMode;

  /**
   * Where a cell's own content sits within its column/row when that axis's
   * `columnWidthMode`/`rowHeightMode` is `'content'` and this specific cell
   * is narrower/shorter than the shared column/row size. No effect on a
   * `'fixed'` axis, where a cell always fills `cellSize` exactly. Defaults
   * to `uiAlignments.topLeft`.
   */
  cellAlignment: UiAlignment;
}

export type GridLayoutGroupEcsComponent = GridLayoutGroupDefaultedOptions;

export const gridLayoutGroupId =
  createComponentId<GridLayoutGroupEcsComponent>('gridLayoutGroup');

const defaultGridLayoutGroupOptions: GridLayoutGroupDefaultedOptions = {
  padding: zeroPadding,
  cellSize: { x: 100, y: 100 },
  spacing: Vec2.zero,
  childAlignment: uiAlignments.topLeft,
  startCorner: 'upperLeft',
  startAxis: 'horizontal',
  constraint: 'flexible',
  constraintCount: 1,
  columnWidthMode: 'fixed',
  rowHeightMode: 'fixed',
  cellAlignment: uiAlignments.topLeft,
};

/**
 * Attaches a {@link GridLayoutGroupEcsComponent} to `entity`, arranging every
 * direct child that has a `RectTransformEcsComponent` and whose
 * `LayoutElementEcsComponent.ignoreLayout` (if present) isn't `true` into a
 * cell grid within the entity's own content box (its resolved rect, inset by
 * `padding`). Unlike the axis groups, cell size never comes from a child's
 * own measured size on a `'fixed'` axis (the default for both
 * `columnWidthMode`/`rowHeightMode`) - every cell on that axis is exactly
 * `cellSize`. Setting either to `'content'` instead derives that axis's
 * column/row size from its cells' own measured preferred size - see
 * `columnWidthMode`'s doc comment.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to. Its own
 * `RectTransformEcsComponent` supplies the group's content box - add one
 * first if `entity` doesn't already have one (e.g. via `createPanel`).
 * @param options - Options for configuring the grid.
 * @throws An error if `columnWidthMode` or `rowHeightMode` is `'content'`
 * while `constraint` is `'flexible'` - content sizing requires a fixed
 * column or row count.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addGridLayoutGroupComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<GridLayoutGroupEcsComponent> = {},
): GridLayoutGroupEcsComponent {
  const merged = { ...defaultGridLayoutGroupOptions, ...options };

  if (
    merged.constraint === 'flexible' &&
    (merged.columnWidthMode === 'content' || merged.rowHeightMode === 'content')
  ) {
    throw new Error(
      `Unable to add GridLayoutGroupEcsComponent to entity "${entity}": columnWidthMode/rowHeightMode "content" requires constraint "fixedColumnCount" or "fixedRowCount", not "flexible" - a flexible grid's column count depends on column width, which would depend on column count.`,
    );
  }

  const component: GridLayoutGroupEcsComponent = {
    ...merged,
    padding: clonePadding(merged.padding),
    cellSize: Vec2.clone(merged.cellSize),
    spacing: Vec2.clone(merged.spacing),
    childAlignment: Vec2.clone(merged.childAlignment),
    cellAlignment: Vec2.clone(merged.cellAlignment),
  };

  return world.addComponent(entity, gridLayoutGroupId, component);
}
