import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { SpriteEcsComponent, spriteId } from '../../rendering/index.js';
import { TextEcsComponent, textId } from '../../text/index.js';
import {
  TooltipEcsComponent,
  tooltipId,
} from '../components/tooltip-component.js';
import {
  UiInteractableEcsComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import {
  deriveUiInteractionVisualState,
  uiInteractionVisualStates,
} from '../types/ui-interaction-visual-state.js';

function setTooltipVisible(
  world: EcsWorld,
  tooltip: TooltipEcsComponent,
  visible: boolean,
): void {
  const sprite = world.getComponent<SpriteEcsComponent>(
    tooltip.panel,
    spriteId,
  );

  if (sprite) {
    sprite.enabled = visible;
  }

  const text = world.getComponent<TextEcsComponent>(tooltip.label, textId);

  if (text) {
    text.enabled = visible;
  }
}

/**
 * Creates a system that shows/hides a `TooltipEcsComponent`'s `panel`/
 * `label` (toggling `SpriteEcsComponent.enabled`/`TextEcsComponent.enabled`,
 * the same mechanism `createDropdown` uses to hide its closed option list)
 * based on the source entity's own `UiInteractableEcsComponent` state:
 * visible while `deriveUiInteractionVisualState` reads `hover` or `pressed`
 * (pointer-hovered, gamepad/keyboard-focused, or mid-press - source-agnostic,
 * like the rest of this module) *and* that state has held continuously for
 * at least `showDelayMilliseconds`; hidden immediately otherwise.
 *
 * Positioning is deliberately not this system's job - `createTooltip`
 * parents the tooltip to the source entity with an ordinary anchored
 * `RectTransformEcsComponent`, so `createUiLayoutEcsSystem` resolves its
 * position every frame exactly like any other UI child, following the
 * source (and reflecting layout changes to it) with no extra code here.
 *
 * Must be registered after `createUiInteractionEcsSystem` and
 * `createUiNavigationEcsSystem` (it reads the interaction state they
 * write) and before `createRenderEcsSystem`.
 * @param time - The time instance driving `hoverElapsedMilliseconds`.
 * @returns The UI tooltip ECS system.
 */
export const createUiTooltipEcsSystem = (
  time: Time,
): EcsSystem<[TooltipEcsComponent, UiInteractableEcsComponent]> => ({
  name: 'uiTooltip',
  query: [tooltipId, uiInteractableId],
  update: (world, { components: [tooltips, interactables] }) => {
    for (let i = 0; i < tooltips.length; i++) {
      const tooltip = tooltips[i];
      const interactable = interactables[i];

      const visualState = deriveUiInteractionVisualState(interactable);
      const isActive =
        visualState === uiInteractionVisualStates.hover ||
        visualState === uiInteractionVisualStates.pressed;

      tooltip.hoverElapsedMilliseconds = isActive
        ? tooltip.hoverElapsedMilliseconds + time.deltaTimeInMilliseconds
        : 0;

      setTooltipVisible(
        world,
        tooltip,
        isActive &&
          tooltip.hoverElapsedMilliseconds >= tooltip.showDelayMilliseconds,
      );
    }
  },
});
