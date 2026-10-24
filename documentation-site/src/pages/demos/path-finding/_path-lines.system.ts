import {
  addPositionComponent,
  addRotationComponent,
  positionId,
  rotationId,
} from '@forge-game-engine/forge/common';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  findGridPath,
  NavigationAgentEcsComponent,
  NavigationGrid,
  navigationAgentId,
} from '@forge-game-engine/forge/navigation';
import {
  addSpriteComponent,
  addVisibilityComponent,
  Color,
  createImageSprite,
  RenderContext,
  spriteId,
  visibilityId,
} from '@forge-game-engine/forge/rendering';
import {
  PathFindingLevelEcsComponent,
  pathFindingLevelId,
} from './_level.component';
import {
  PathFindingViewEcsComponent,
  pathFindingViewId,
} from './_path-finding-view.component';
import {
  UnitPathLinesEcsComponent,
  unitPathLinesId,
} from './_unit-path-lines.component';

const rawPathColor = new Color(1, 1, 1, 0.45);
const rawPathWidth = 2;
const smoothedPathWidth = 3;

/**
 * The path a unit's agent would walk without smoothing: the cell centres
 * `findGridPath` returns, from where the path was planned, ending at the
 * target when the search reached the target's own cell. The agent's
 * planner runs the same search before it smooths the path, so this is the
 * line the smoothing straightened.
 */
const findRawPath = (
  grid: NavigationGrid,
  agent: NavigationAgentEcsComponent,
): Vector2[] => {
  const [start] = agent.path;
  const target = agent.plannedTarget;

  if (!start || !target) {
    return [];
  }

  const { status, points, goalSnapped } = findGridPath(grid, start, target);
  const reachedTarget = status === 'found' && !goalSnapped;

  return [start, ...points, ...(reachedTarget ? [target] : [])];
};

/**
 * Shows segment `index` of a pool as a line from `from` to `to`, creating
 * the segment's entity the first time the pool needs it. A segment is the
 * white texture stretched to the line's length along its local X axis and
 * turned to point from `from` to `to`.
 */
const showSegment = (
  world: EcsWorld,
  renderContext: RenderContext,
  pool: number[],
  index: number,
  line: { from: Vector2; to: Vector2; width: number; color: Color },
): void => {
  if (index === pool.length) {
    const segment = world.createEntity();

    addPositionComponent(world, segment);
    addRotationComponent(world, segment);
    addSpriteComponent(world, segment, {
      ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    });
    addVisibilityComponent(world, segment);
    pool.push(segment);
  }

  const segment = pool[index];
  const position = world.getComponent(segment, positionId);
  const rotation = world.getComponent(segment, rotationId);
  const sprite = world.getComponent(segment, spriteId);
  const visibility = world.getComponent(segment, visibilityId);

  if (!position || !rotation || !sprite || !visibility) {
    return;
  }

  const { from, to } = line;
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  position.local.x = (from.x + to.x) / 2;
  position.local.y = (from.y + to.y) / 2;
  rotation.local = Math.atan2(dy, dx);
  sprite.width = Math.hypot(dx, dy);
  sprite.height = line.width;
  sprite.tintColor = line.color;
  visibility.visible = true;
};

/**
 * Draws a polyline with a pool's segments, and hides the segments it
 * doesn't need.
 */
const drawPolyline = (
  world: EcsWorld,
  renderContext: RenderContext,
  pool: number[],
  points: readonly Vector2[],
  style: { width: number; color: Color },
): void => {
  const segmentCount = Math.max(points.length - 1, 0);

  for (let i = 0; i < segmentCount; i++) {
    showSegment(world, renderContext, pool, i, {
      from: points[i],
      to: points[i + 1],
      ...style,
    });
  }

  for (let i = segmentCount; i < pool.length; i++) {
    const visibility = world.getComponent(pool[i], visibilityId);

    if (visibility) {
      visibility.visible = false;
    }
  }
};

const drawUnitPaths = (
  world: EcsWorld,
  renderContext: RenderContext,
  grid: NavigationGrid,
  view: PathFindingViewEcsComponent,
  unit: number,
): void => {
  const agent = world.getComponent(unit, navigationAgentId);
  const lines = world.getComponent<UnitPathLinesEcsComponent>(
    unit,
    unitPathLinesId,
  );
  const position = world.getComponent(unit, positionId);

  if (!agent || !lines || !position) {
    return;
  }

  if (agent.path !== lines.drawnPath) {
    lines.drawnPath = agent.path;
    lines.rawPath = findRawPath(grid, agent);
  }

  const isWalking = agent.status !== 'idle' && agent.status !== 'arrived';
  // The rest of the smoothed path: from the unit to the point it's walking
  // to, then on through the remaining points.
  const smoothedPath =
    isWalking && view.showSmoothedPaths && agent.path.length > 0
      ? [position.world, ...agent.path.slice(agent.waypointIndex)]
      : [];
  const rawPath = isWalking && view.showRawPaths ? lines.rawPath : [];

  drawPolyline(world, renderContext, lines.rawSegments, rawPath, {
    width: rawPathWidth,
    color: rawPathColor,
  });
  drawPolyline(world, renderContext, lines.smoothedSegments, smoothedPath, {
    width: smoothedPathWidth,
    color: lines.color,
  });
};

/**
 * Creates the system that draws each walking unit's paths: the smoothed
 * path it walks, in the unit's color, and the raw path through the cell
 * centres the grid search found, in white. The panel's toggles turn each
 * on and off.
 *
 * Register it before `createTransformEcsSystem`, so the segments are drawn
 * where it puts them on the same frame. It draws the paths the agents
 * planned on the previous tick, from where the units were then.
 * @param renderContext - The render context whose white texture the lines
 * are drawn with.
 * @returns The ECS system.
 */
export const createPathLinesEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[PathFindingLevelEcsComponent, PathFindingViewEcsComponent]> => ({
  query: [pathFindingLevelId, pathFindingViewId],
  update: (world, { components: [levels, views] }) => {
    for (let i = 0; i < levels.length; i++) {
      for (const unit of levels[i].units) {
        drawUnitPaths(world, renderContext, levels[i].grid, views[i], unit);
      }
    }
  },
});
