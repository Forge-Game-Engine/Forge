import {
  createTransformEcsSystem,
  createTransformInterpolationEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import {
  createGridPathPlanner,
  createNavigationAgentEcsSystem,
} from '@forge-game-engine/forge/navigation';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhase,
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

  // The agents and physics run once per fixed step. The agents plan and
  // steer with the same delta physics integrates their velocity over, so a
  // unit slows onto its target instead of overshooting it. The transform
  // system comes first, so each step reads the poses the previous step left
  // in `local`.
  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  world.addSystem(createTransformEcsSystem(time), physics);
  world.addSystem(createNavigationAgentEcsSystem(time), physics);
  world.addSystem(createApplyVelocityEcsSystem(), physics);
  // A top-down level: no gravity.
  createBroadPhase(world);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
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
    physics,
  );
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);
  world.addSystem(createTransformInterpolationEcsSystem(), physics);

  // Once per frame, after the fixed steps.
  // Sets the units' targets and moves the dragged wall's `position.local`.
  world.addSystem(createPointerEcsSystem(renderContext, inputs));
  // Before the transform system, so what they draw is in place this frame.
  world.addSystem(createGridOverlayEcsSystem());
  world.addSystem(createPathLinesEcsSystem(renderContext, time));
  world.addSystem(createTransformEcsSystem(time));
  // Bakes the grid from the walls where the transform system just put
  // them, so the agents plan around a moved wall from the next step.
  world.addSystem(createBakeGridEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
