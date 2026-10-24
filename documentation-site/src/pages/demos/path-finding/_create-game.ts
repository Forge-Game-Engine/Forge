import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  createGridPathPlanner,
  createNavigationAgentEcsSystem,
} from '@forge-game-engine/forge/navigation';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createNarrowPhaseEcsSystem,
} from '@forge-game-engine/forge/physics';
import {
  Color,
  createCamera,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createApplyVelocityEcsSystem } from './_apply-velocity.system';
import { createBakeGridEcsSystem } from './_bake-grid.system';
import { createInputs } from './_create-inputs';
import { createLevel } from './_create-level';
import { createUnits, unitRadius } from './_create-units';
import { createGridOverlayEcsSystem } from './_grid-overlay.system';
import { addPathFindingLevelComponent } from './_level.component';
import { createPathLinesEcsSystem } from './_path-lines.system';
import {
  addPathFindingViewComponent,
  PathFindingViewEcsComponent,
} from './_path-finding-view.component';
import { createPointerEcsSystem } from './_pointer.system';

/**
 * One world unit is one pixel and the units are about half a meter across,
 * so physics tuned for meters is scaled by 32.
 */
const pixelsPerMeter = 32;

/**
 * Builds the path finding demo: a top-down level of static walls baked into
 * a navigation grid, and a group of units with navigation agents and rigid
 * bodies that walk to where you click. Dragging a wall bakes the grid again,
 * and the units plan new paths around it.
 * @param onViewReady - Called with the demo's view once it exists, so the
 * page's panel can change what's drawn.
 * @returns The created game.
 */
export const createPathFindingGame = async (
  onViewReady: (view: PathFindingViewEcsComponent) => void,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    clearColor: new Color(0.08, 0.09, 0.12, 1),
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });
  const { grid, cellOverlays, bounds } = createLevel(world, renderContext);
  // Every unit plans over the same grid with the same planner. It smooths
  // each path into straight lines between the corners it turns at.
  const planner = createGridPathPlanner(grid);
  const units = await createUnits(world, renderContext, planner);

  const demo = world.createEntity();

  addPathFindingLevelComponent(world, demo, {
    grid,
    camera,
    units,
    unitRadius,
    bounds,
  });
  onViewReady(addPathFindingViewComponent(world, demo, cellOverlays));

  const inputs = createInputs(world, time, game.container);
  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  // Sets the units' targets and moves the dragged wall's `position.local`.
  world.addSystem(createPointerEcsSystem(renderContext, inputs));
  // Before the transform system, so what they draw is in place this frame.
  world.addSystem(createGridOverlayEcsSystem());
  world.addSystem(createPathLinesEcsSystem(renderContext));
  world.addSystem(createTransformEcsSystem());
  // Bakes the grid from the walls where the transform system just put
  // them, so the agents plan around a moved wall on the same tick.
  world.addSystem(createBakeGridEcsSystem());
  world.addSystem(createNavigationAgentEcsSystem(time));
  world.addSystem(createApplyVelocityEcsSystem());
  // A top-down level: no gravity.
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  );
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
      {
        slop: 0.002 * pixelsPerMeter,
        maxBiasSpeed: 3 * pixelsPerMeter,
        restitutionThreshold: pixelsPerMeter,
      },
    ),
  );
  world.addSystem(createEulerIntegrationEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
