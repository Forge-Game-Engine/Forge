import { beforeEach, describe, expect, it } from 'vitest';
import { createUiNavigationEcsSystem } from './ui-navigation-system.js';
import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  Axis2dAction,
  buttonMoments,
  InputManager,
  TriggerAction,
} from '../../input/index.js';
import {
  addCameraComponent,
  addVisibilityComponent,
} from '../../rendering/index.js';
import {
  addCanvasComponent,
  canvasId,
  CanvasInputOptions,
} from '../components/canvas-component.js';
import { addCanvasGroupComponent } from '../components/canvas-group-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import { addUiFocusComponent } from '../components/ui-focus-component.js';
import {
  addUiInteractableComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import { UiAnchor } from '../types/ui-anchor.js';

const createTestCanvas = (
  world: EcsWorld,
  options: CanvasInputOptions = {},
): number => {
  const camera = world.createEntity();

  addPositionComponent(world, camera);
  addCameraComponent(world, camera, { verticalWorldUnits: 1080 });

  const canvas = world.createEntity();

  addPositionComponent(world, canvas);
  addRectTransformComponent(world, canvas);
  addCanvasComponent(world, canvas, { camera, ...options });

  return canvas;
};

/** Places an interactable button at `anchoredPosition`, resolving its rect directly (no layout system in these tests). */
const createButtonAt = (
  world: EcsWorld,
  canvas: number,
  anchoredPosition: { x: number; y: number },
): number => {
  const entity = world.createEntity();

  addPositionComponent(world, entity);
  world.setParent(entity, canvas);

  const rectTransform = addRectTransformComponent(world, entity, {
    ...UiAnchor.center({ x: 100, y: 50 }),
    anchoredPosition,
  });

  rectTransform.rect = {
    min: { x: anchoredPosition.x - 50, y: anchoredPosition.y - 25 },
    max: { x: anchoredPosition.x + 50, y: anchoredPosition.y + 25 },
  };

  addUiInteractableComponent(world, entity);

  return entity;
};

describe('createUiNavigationEcsSystem', () => {
  const testSource = { name: 'test' };

  let inputManager: InputManager;

  beforeEach(() => {
    inputManager = new InputManager();
  });

  /** Reports `x`/`y` for `action` from a test input source. */
  const navigate = (action: Axis2dAction, x: number, y: number): void => {
    inputManager.addAxis2dActions(action);
    inputManager.setAxis2dInput(testSource, action, x, y);
  };

  /** Runs one frame, ending it the way `registerInputs`' reset system does. */
  const tick = (world: EcsWorld): void => {
    world.update();
    inputManager.reset();
  };

  /** Presses and releases a button bound to `action` on a test input source. */
  const press = (action: TriggerAction): void => {
    const binding = { action, moment: buttonMoments.down, displayText: '' };

    inputManager.addTriggerActions(action);
    inputManager.setTriggerInput(testSource, binding, true);
    inputManager.setTriggerInput(testSource, binding, false);
  };

  it('resets wasInvokedThisFrame to false every tick before applying this tick', () => {
    const world = new EcsWorld();
    const canvas = createTestCanvas(world);
    const button = createButtonAt(world, canvas, { x: 0, y: 0 });
    const interactable = world.getComponent(button, uiInteractableId)!;

    interactable.wasInvokedThisFrame = true;

    world.addSystem(createUiNavigationEcsSystem());
    tick(world);

    expect(interactable.wasInvokedThisFrame).toBe(false);
  });

  it('focuses the topmost candidate when navigating with nothing focused yet', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const first = createButtonAt(world, canvas, { x: 0, y: 0 });
    createButtonAt(world, canvas, { x: 200, y: 0 });

    navigate(navigateInput, 1, 0);

    world.addSystem(createUiNavigationEcsSystem());
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(first);
  });

  it('never focuses an element that is not focusable', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const viewport = createButtonAt(world, canvas, { x: 0, y: 0 });
    const second = createButtonAt(world, canvas, { x: 200, y: 0 });

    world.getComponent(viewport, uiInteractableId)!.focusable = false;
    navigate(navigateInput, 1, 0);

    world.addSystem(createUiNavigationEcsSystem());
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(second);
  });

  it('moves focus to the nearest candidate in the pressed direction', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const left = createButtonAt(world, canvas, { x: -200, y: 0 });
    const right = createButtonAt(world, canvas, { x: 200, y: 0 });

    world.addSystem(createUiNavigationEcsSystem());

    navigate(navigateInput, 1, 0);
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(left);

    // Return to neutral, then press right again - a held stick shouldn't
    // repeat-move every tick, only on a fresh crossing of the threshold.
    navigate(navigateInput, 0, 0);
    tick(world);
    navigate(navigateInput, 1, 0);
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(right);
  });

  it('moves focus for a press released before the next tick', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const left = createButtonAt(world, canvas, { x: -200, y: 0 });
    const right = createButtonAt(world, canvas, { x: 200, y: 0 });

    world.addSystem(createUiNavigationEcsSystem());
    world.getComponent(canvas, canvasId)!.focusedEntity = left;

    navigate(navigateInput, 1, 0);
    navigate(navigateInput, 0, 0);
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(right);
  });

  it('takes one step per press, in each press direction, when several land in one tick', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const left = createButtonAt(world, canvas, { x: -200, y: 0 });
    const middle = createButtonAt(world, canvas, { x: 0, y: 0 });
    const right = createButtonAt(world, canvas, { x: 200, y: 0 });

    world.addSystem(createUiNavigationEcsSystem());
    world.getComponent(canvas, canvasId)!.focusedEntity = left;

    navigate(navigateInput, 1, 0);
    navigate(navigateInput, 0, 0);
    navigate(navigateInput, 1, 0);
    navigate(navigateInput, 0, 0);
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(right);

    navigate(navigateInput, -1, 0);
    navigate(navigateInput, 0, 0);
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(middle);
  });

  it('does not move focus again while navigateInput stays held past the threshold', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const left = createButtonAt(world, canvas, { x: -200, y: 0 });
    createButtonAt(world, canvas, { x: 200, y: 0 });

    world.addSystem(createUiNavigationEcsSystem());

    navigate(navigateInput, 1, 0);
    tick(world);
    tick(world);
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(left);
  });

  it('prefers an explicit UiFocusEcsComponent override over the automatic search', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const nearby = createButtonAt(world, canvas, { x: 200, y: 0 });
    const overrideTarget = createButtonAt(world, canvas, { x: 900, y: 0 });
    const start = createButtonAt(world, canvas, { x: -200, y: 0 });

    addUiFocusComponent(world, start, { right: overrideTarget });

    const canvasComponent = world.getComponent(canvas, canvasId)!;
    canvasComponent.focusedEntity = start;
    world.getComponent(start, uiInteractableId)!.isFocused = true;

    world.addSystem(createUiNavigationEcsSystem());

    navigate(navigateInput, 1, 0);
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(
      overrideTarget,
    );
    expect(world.getComponent(canvas, canvasId)!.focusedEntity).not.toBe(
      nearby,
    );
  });

  it('raises onInvoke on the focused element when submitInput triggers', () => {
    const world = new EcsWorld();
    const submitInput = new TriggerAction('submit');
    const canvas = createTestCanvas(world, { submitInput });
    const button = createButtonAt(world, canvas, { x: 0, y: 0 });
    const interactable = world.getComponent(button, uiInteractableId)!;

    let activations = 0;
    interactable.onInvoke.registerListener(() => (activations += 1));

    world.getComponent(canvas, canvasId)!.focusedEntity = button;
    interactable.isFocused = true;

    press(submitInput);

    world.addSystem(createUiNavigationEcsSystem());
    tick(world);

    expect(activations).toBe(1);
    expect(interactable.wasInvokedThisFrame).toBe(true);
  });

  it('does not raise onInvoke when the focused element sits under a CanvasGroupEcsComponent with interactable: false', () => {
    const world = new EcsWorld();
    const submitInput = new TriggerAction('submit');
    const canvas = createTestCanvas(world, { submitInput });
    const button = createButtonAt(world, canvas, { x: 0, y: 0 });
    const interactable = world.getComponent(button, uiInteractableId)!;

    addCanvasGroupComponent(world, button, { interactable: false });

    let activations = 0;
    interactable.onInvoke.registerListener(() => (activations += 1));

    world.getComponent(canvas, canvasId)!.focusedEntity = button;
    interactable.isFocused = true;

    press(submitInput);

    world.addSystem(createUiNavigationEcsSystem());
    tick(world);

    expect(activations).toBe(0);
  });

  it('skips a candidate whose ancestor CanvasGroupEcsComponent has interactable: false when picking the topmost candidate', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const disabled = createButtonAt(world, canvas, { x: 0, y: 0 });
    const enabled = createButtonAt(world, canvas, { x: 200, y: 0 });

    addCanvasGroupComponent(world, disabled, { interactable: false });

    navigate(navigateInput, 1, 0);

    world.addSystem(createUiNavigationEcsSystem());
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(enabled);
  });

  it('skips a hidden candidate when moving focus', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const start = createButtonAt(world, canvas, { x: 0, y: 0 });
    const hidden = createButtonAt(world, canvas, { x: 200, y: 0 });
    const beyond = createButtonAt(world, canvas, { x: 400, y: 0 });

    addVisibilityComponent(world, hidden, { visible: false });
    world.getComponent(canvas, canvasId)!.focusedEntity = start;
    navigate(navigateInput, 1, 0);

    world.addSystem(createUiNavigationEcsSystem());
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(beyond);
  });

  it('ignores an explicit UiFocusEcsComponent override that points at a hidden element', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const start = createButtonAt(world, canvas, { x: 0, y: 0 });
    const hidden = createButtonAt(world, canvas, { x: 0, y: -200 });
    const right = createButtonAt(world, canvas, { x: 200, y: 0 });

    addUiFocusComponent(world, start, { right: hidden });
    addVisibilityComponent(world, hidden, { visible: false });
    world.getComponent(canvas, canvasId)!.focusedEntity = start;
    navigate(navigateInput, 1, 0);

    world.addSystem(createUiNavigationEcsSystem());
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(right);
  });

  it('releases focus when the focused element is hidden by an ancestor', () => {
    const world = new EcsWorld();
    const submitInput = new TriggerAction('submit');
    const canvas = createTestCanvas(world, { submitInput });
    const page = world.createEntity();

    world.setParent(page, canvas);

    const button = createButtonAt(world, canvas, { x: 0, y: 0 });
    const interactable = world.getComponent(button, uiInteractableId)!;
    let invokeCount = 0;

    world.setParent(button, page);
    interactable.onInvoke.registerListener(() => invokeCount++);
    world.getComponent(canvas, canvasId)!.focusedEntity = button;
    interactable.isFocused = true;
    addVisibilityComponent(world, page, { visible: false });
    press(submitInput);

    world.addSystem(createUiNavigationEcsSystem());
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBeNull();
    expect(interactable.isFocused).toBe(false);
    expect(invokeCount).toBe(0);
  });

  it('clears focus when cancelInput triggers', () => {
    const world = new EcsWorld();
    const cancelInput = new TriggerAction('cancel');
    const canvas = createTestCanvas(world, { cancelInput });
    const button = createButtonAt(world, canvas, { x: 0, y: 0 });
    const interactable = world.getComponent(button, uiInteractableId)!;

    world.getComponent(canvas, canvasId)!.focusedEntity = button;
    interactable.isFocused = true;

    press(cancelInput);

    world.addSystem(createUiNavigationEcsSystem());
    tick(world);

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBeNull();
    expect(interactable.isFocused).toBe(false);
  });
});
