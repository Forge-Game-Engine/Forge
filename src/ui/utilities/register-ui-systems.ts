import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { RenderContext, SafeAreaInsets } from '../../rendering/index.js';
import { createUiAspectRatioFitterEcsSystem } from '../systems/ui-aspect-ratio-fitter-system.js';
import { createUiCanvasGroupEcsSystem } from '../systems/ui-canvas-group-system.js';
import { createUiInteractionEcsSystem } from '../systems/ui-interaction-system.js';
import { createUiLayoutGroupEcsSystem } from '../systems/ui-layout-group-system.js';
import { createUiLayoutEcsSystem } from '../systems/ui-layout-system.js';
import { createUiNavigationEcsSystem } from '../systems/ui-navigation-system.js';
import { createUiProgressBarEcsSystem } from '../systems/ui-progress-bar-system.js';
import { createUiRaycastEcsSystem } from '../systems/ui-raycast-system.js';
import { createUiSafeAreaEcsSystem } from '../systems/ui-safe-area-system.js';
import { createUiSliderEcsSystem } from '../systems/ui-slider-system.js';
import { createUiToggleEcsSystem } from '../systems/ui-toggle-system.js';
import { createUiTooltipEcsSystem } from '../systems/ui-tooltip-system.js';
import { createUiTransitionEcsSystem } from '../systems/ui-transition-system.js';
import { UiPointerSource } from '../types/ui-pointer-source.js';

/** Options for {@link registerUiSystems}. */
export interface RegisterUiSystemsOptions {
  /**
   * The pointer source every canvas's interactables (see
   * `UiInteractableEcsComponent`) are hit-tested and pressed/hovered/dragged
   * against - `MouseInputSource` satisfies this without any changes, and any
   * other device (e.g. a touchscreen) can too by exposing the same shape.
   * Omit for a game with no pointer interaction at all - canvases are still
   * fully focus-navigable through their own `submitInput`/`navigateInput`
   * (see `CanvasInputOptions`).
   */
  pointerSource?: UiPointerSource;

  /**
   * Returns the browser viewport's current safe-area insets - supply it
   * (`getSafeAreaInsets` from `@forge-game-engine/forge/rendering` satisfies
   * this directly) to register `createUiSafeAreaEcsSystem`, so any
   * `UiSafeAreaEcsComponent` element on any canvas stays clear of a
   * notch/cutout/home indicator. Omit for a game that doesn't need
   * safe-area support.
   */
  getSafeAreaInsets?: () => SafeAreaInsets;
}

/**
 * Registers every system a `createUiCanvas` canvas depends on: layout,
 * layout groups, aspect ratio fitting, progress bars, canvas groups, focus
 * navigation, color transitions, toggles, and tooltips - plus, once a
 * `pointerSource` is supplied, pointer raycasting/interaction/sliders, and
 * once `getSafeAreaInsets` is supplied, safe-area insetting - each wired in
 * the order their cross-system reads/writes require.
 *
 * Call this once per `EcsWorld`, the same way a game calls `registerInputs`
 * once regardless of how many input sources/actions it adds afterwards -
 * `world.addSystem` has no built-in protection against registering the same
 * kind of system twice, so calling this more than once for the same world
 * would double-process every canvas each tick (e.g. firing `onInvoke` twice
 * per submit). Create as many canvases as you like afterwards with
 * `createUiCanvas`, which only creates the canvas entity itself and doesn't
 * touch system registration.
 *
 * Registration order: raycast, then navigation, then interaction, then
 * toggle/transition/tooltip (order between those three doesn't matter, none
 * reads another's writes), then slider - raycast must run before navigation
 * and interaction read its hit-test result, interaction must run before
 * transition/tooltip read the interaction state it just wrote, navigation
 * must run before interaction because navigation is what resets
 * `wasInvokedThisFrame` to `false` each tick before interaction
 * conditionally sets it back to `true` for the pointer path, toggle/tooltip
 * must run after both navigation and interaction for the same reason, and
 * slider must run after interaction (it reads `pressCapture`). Progress
 * bars/aspect ratio fitting/layout groups have no interaction dependency
 * and run before layout, so a value they write is resolved into a rect the
 * very same tick rather than lagging a frame behind; canvas groups run
 * after layout so every UI system's relative order stays predictable.
 *
 * The caller is still responsible for registering `createTransformEcsSystem`
 * and `createRenderEcsSystem` with `world` - **after** this call, so the
 * layout system (which writes `position.local`) runs before the transform
 * system (which reads it to compute `position.world`), which in turn must
 * run before the render system. Both are ordinary, already-existing systems
 * a game registers once regardless of UI, so this doesn't register a second
 * instance of either.
 * @param world - The ECS world to register the UI systems with.
 * @param renderContext - The render context the layout/raycast/interaction/
 * slider/safe-area systems resolve canvas roots and pointer positions
 * against.
 * @param time - The time instance driving `createUiTransitionEcsSystem`'s
 * and `createUiTooltipEcsSystem`'s timers.
 * @param options - The pointer source and safe-area callback to wire up, if
 * this game uses them.
 */
export function registerUiSystems(
  world: EcsWorld,
  renderContext: RenderContext,
  time: Time,
  options: RegisterUiSystemsOptions = {},
): void {
  const { pointerSource, getSafeAreaInsets } = options;

  const progressBar = createUiProgressBarEcsSystem();
  const aspectRatioFitter = createUiAspectRatioFitterEcsSystem();
  const layoutGroup = createUiLayoutGroupEcsSystem();
  const layout = createUiLayoutEcsSystem(renderContext);

  world.addSystem(progressBar);
  world.addSystem(aspectRatioFitter);
  world.addSystem(layoutGroup, {
    after: [progressBar, aspectRatioFitter],
  });

  const layoutDependencies: EcsSystem[] = [layoutGroup];

  if (getSafeAreaInsets) {
    const safeArea = createUiSafeAreaEcsSystem(
      renderContext,
      getSafeAreaInsets,
    );

    world.addSystem(safeArea);
    layoutDependencies.push(safeArea);
  }

  world.addSystem(layout, { after: layoutDependencies });
  // Applies CanvasGroupEcsComponent's inherited alpha to
  // SpriteEcsComponent/TextEcsComponent.opacityMultiplier - doesn't depend
  // on resolved rects, but runs after layout so every UI system's relative
  // order stays predictable, and before whatever renders this frame reads
  // the sprites/text it wrote.
  world.addSystem(createUiCanvasGroupEcsSystem(), { after: [layout] });

  const navigation = createUiNavigationEcsSystem();

  world.addSystem(navigation);

  const transition = createUiTransitionEcsSystem(time);

  world.addSystem(transition, { after: [navigation] });

  const toggle = createUiToggleEcsSystem();

  world.addSystem(toggle, { after: [navigation] });

  const tooltip = createUiTooltipEcsSystem(time);

  world.addSystem(tooltip, { after: [navigation] });

  if (pointerSource) {
    const raycast = createUiRaycastEcsSystem(pointerSource, renderContext);

    world.addSystem(raycast, { before: [navigation] });

    const interaction = createUiInteractionEcsSystem(
      pointerSource,
      renderContext,
    );

    world.addSystem(interaction, {
      after: [navigation, raycast],
      before: [transition, toggle, tooltip],
    });

    const slider = createUiSliderEcsSystem(pointerSource, renderContext);

    world.addSystem(slider, { after: [interaction] });
  }
}
