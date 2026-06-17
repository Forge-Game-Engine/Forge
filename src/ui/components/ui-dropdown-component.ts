import { createComponentId } from '../../ecs/ecs-component.js';
import { ForgeEvent } from '../../events/forge-event.js';
import { ParameterizedForgeEvent } from '../../events/index.js';

/**
 * Payload emitted by {@link UiDropdownEcsComponent.onChange}.
 */
export interface UiDropdownChangeEvent {
  /** The dropdown entity. */
  entity: number;
  /** The index of the newly selected option. */
  selectedIndex: number;
  /** The string value of the newly selected option. */
  value: string;
}

/**
 * Stores the state of a dropdown / select widget.
 *
 * Attached to the root entity created by {@link createUiDropdown}.
 * The dropdown ECS system reads and writes `isOpen` to drive
 * popup visibility, focus-trap, and option selection.
 *
 * The popup entity tree is created eagerly by the factory — enabling and
 * disabling renderables is cheaper than creating/destroying entities each
 * time the popup opens or closes.
 */
export interface UiDropdownEcsComponent {
  /** Available option labels. */
  options: string[];

  /** Index of the currently selected option within `options`. */
  selectedIndex: number;

  /**
   * `true` while the popup is visible.
   * Toggle to open/close — the system detects the change and updates the
   * popup entity visibility accordingly.
   */
  isOpen: boolean;

  /** Raised whenever the selected option changes. */
  onChange: ParameterizedForgeEvent<UiDropdownChangeEvent>;

  /** Raised when the popup opens. */
  onOpen: ForgeEvent;

  /** Raised when the popup closes. */
  onClose: ForgeEvent;

  /** Entity id of the trigger button entity. */
  triggerEntity: number;

  /**
   * Entity id of the popup panel entity (always present; renderables are
   * enabled/disabled by the system rather than creating/destroying entities).
   */
  popupEntity: number;

  /** Entity ids of the per-option button entities within the popup scroll group. */
  optionEntities: number[];

  /**
   * Entity id of the canvas root.
   * The popup is parented to the canvas to avoid being clipped by ancestor
   * `UiClipEcsComponent` regions.
   */
  canvasEntity: number;
}

/** Component id for {@link UiDropdownEcsComponent}. */
export const uiDropdownId =
  createComponentId<UiDropdownEcsComponent>('ui-dropdown');
