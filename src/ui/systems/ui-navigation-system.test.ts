import { describe, expect, it } from 'vitest';
import { createUiNavigationEcsSystem } from './ui-navigation-system.js';
import {
  addParentComponent,
  addPositionComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Axis2dAction, TriggerAction } from '../../input/index.js';
import { addCameraComponent } from '../../rendering/index.js';
import {
  addCanvasComponent,
  canvasId,
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
  options: Omit<Parameters<typeof addCanvasComponent>[2], 'camera'> = {},
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
  addParentComponent(world, entity, { parent: canvas });

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
  it('resets wasInvokedThisFrame to false every tick before applying this tick', () => {
    const world = new EcsWorld();
    const canvas = createTestCanvas(world);
    const button = createButtonAt(world, canvas, { x: 0, y: 0 });
    const interactable = world.getComponent(button, uiInteractableId)!;

    interactable.wasInvokedThisFrame = true;

    world.addSystem(createUiNavigationEcsSystem());
    world.update();

    expect(interactable.wasInvokedThisFrame).toBe(false);
  });

  it('focuses the topmost candidate when navigating with nothing focused yet', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const first = createButtonAt(world, canvas, { x: 0, y: 0 });
    createButtonAt(world, canvas, { x: 200, y: 0 });

    navigateInput.set(1, 0);

    world.addSystem(createUiNavigationEcsSystem());
    world.update();

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(first);
  });

  it('moves focus to the nearest candidate in the pressed direction', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const left = createButtonAt(world, canvas, { x: -200, y: 0 });
    const right = createButtonAt(world, canvas, { x: 200, y: 0 });

    world.addSystem(createUiNavigationEcsSystem());

    navigateInput.set(1, 0);
    world.update();

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(left);

    // Return to neutral, then press right again - a held stick shouldn't
    // repeat-move every tick, only on a fresh crossing of the threshold.
    navigateInput.set(0, 0);
    world.update();
    navigateInput.set(1, 0);
    world.update();

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(right);
  });

  it('does not move focus again while navigateInput stays held past the threshold', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const left = createButtonAt(world, canvas, { x: -200, y: 0 });
    createButtonAt(world, canvas, { x: 200, y: 0 });

    world.addSystem(createUiNavigationEcsSystem());

    navigateInput.set(1, 0);
    world.update();
    world.update();
    world.update();

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

    navigateInput.set(1, 0);
    world.update();

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

    submitInput.trigger();

    world.addSystem(createUiNavigationEcsSystem());
    world.update();

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

    submitInput.trigger();

    world.addSystem(createUiNavigationEcsSystem());
    world.update();

    expect(activations).toBe(0);
  });

  it('skips a candidate whose ancestor CanvasGroupEcsComponent has interactable: false when picking the topmost candidate', () => {
    const world = new EcsWorld();
    const navigateInput = new Axis2dAction('navigate');
    const canvas = createTestCanvas(world, { navigateInput });
    const disabled = createButtonAt(world, canvas, { x: 0, y: 0 });
    const enabled = createButtonAt(world, canvas, { x: 200, y: 0 });

    addCanvasGroupComponent(world, disabled, { interactable: false });

    navigateInput.set(1, 0);

    world.addSystem(createUiNavigationEcsSystem());
    world.update();

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(enabled);
  });

  it('clears focus when cancelInput triggers', () => {
    const world = new EcsWorld();
    const cancelInput = new TriggerAction('cancel');
    const canvas = createTestCanvas(world, { cancelInput });
    const button = createButtonAt(world, canvas, { x: 0, y: 0 });
    const interactable = world.getComponent(button, uiInteractableId)!;

    world.getComponent(canvas, canvasId)!.focusedEntity = button;
    interactable.isFocused = true;

    cancelInput.trigger();

    world.addSystem(createUiNavigationEcsSystem());
    world.update();

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBeNull();
    expect(interactable.isFocused).toBe(false);
  });
});
