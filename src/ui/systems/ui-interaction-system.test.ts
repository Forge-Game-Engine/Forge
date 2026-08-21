import { describe, expect, it } from 'vitest';
import { createUiInteractionEcsSystem } from './ui-interaction-system.js';
import { createUiLayoutEcsSystem } from './ui-layout-system.js';
import { createUiNavigationEcsSystem } from './ui-navigation-system.js';
import { createUiRaycastEcsSystem } from './ui-raycast-system.js';
import {
  addParentComponent,
  addPositionComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  MouseButton,
  mouseButtons,
  MouseInputSource,
} from '../../input/index.js';
import { addCameraComponent, RenderContext } from '../../rendering/index.js';
import {
  addCanvasComponent,
  canvasId,
} from '../components/canvas-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import {
  addUiInteractableComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import { UiAnchor } from '../types/ui-anchor.js';
import { setUiFocus } from '../utilities/set-ui-focus.js';

const buildRenderContext = (width: number, height: number): RenderContext =>
  ({ width, height }) as RenderContext;

interface FakeMouseInputSource {
  position: { x: number; y: number };
  buttonsDown: Set<MouseButton>;
  buttonsUp: Set<MouseButton>;
}

const buildMouseInputSource = (): FakeMouseInputSource & MouseInputSource =>
  ({
    position: { x: 0, y: 0 },
    buttonsDown: new Set(),
    buttonsUp: new Set(),
  }) as FakeMouseInputSource & MouseInputSource;

const createTestCanvas = (
  world: EcsWorld,
): { canvas: number; camera: number } => {
  const camera = world.createEntity();

  addPositionComponent(world, camera);
  addCameraComponent(world, camera, { verticalWorldUnits: 1080 });

  const canvas = world.createEntity();

  addPositionComponent(world, canvas);
  addRectTransformComponent(world, canvas);
  addCanvasComponent(world, canvas, { camera });

  return { canvas, camera };
};

const createInteractablePanel = (
  world: EcsWorld,
  parent: number,
  sizeDelta: { x: number; y: number },
  overrides: Parameters<typeof addUiInteractableComponent>[2] = {},
): number => {
  const entity = world.createEntity();

  addPositionComponent(world, entity);
  addParentComponent(world, entity, { parent });
  addRectTransformComponent(world, entity, { ...UiAnchor.center, sizeDelta });
  addUiInteractableComponent(world, entity, overrides);

  return entity;
};

describe('createUiInteractionEcsSystem', () => {
  const setUp = () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const mouseInputSource = buildMouseInputSource();
    const { canvas } = createTestCanvas(world);
    const panel = createInteractablePanel(world, canvas, { x: 300, y: 150 });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.addSystem(createUiRaycastEcsSystem(mouseInputSource, renderContext));
    world.addSystem(createUiNavigationEcsSystem());
    world.addSystem(
      createUiInteractionEcsSystem(mouseInputSource, renderContext),
    );

    const tick = () => {
      world.update();
      mouseInputSource.buttonsDown.clear();
      mouseInputSource.buttonsUp.clear();
    };

    const interactable = () => world.getComponent(panel, uiInteractableId)!;

    return { world, mouseInputSource, canvas, panel, tick, interactable };
  };

  it('raises onPointerEnter/onPointerExit and sets isHovered as the pointer moves over and off the rect', () => {
    const { mouseInputSource, tick, interactable } = setUp();

    let enters = 0;
    let exits = 0;
    interactable().onPointerEnter.registerListener(() => (enters += 1));
    interactable().onPointerExit.registerListener(() => (exits += 1));

    mouseInputSource.position = { x: 0, y: 0 };
    tick();

    expect(interactable().isHovered).toBe(false);
    expect(enters).toBe(0);

    mouseInputSource.position = { x: 960, y: 540 };
    tick();

    expect(interactable().isHovered).toBe(true);
    expect(enters).toBe(1);
    expect(exits).toBe(0);

    mouseInputSource.position = { x: 0, y: 0 };
    tick();

    expect(interactable().isHovered).toBe(false);
    expect(exits).toBe(1);
  });

  it('raises onInvoke and sets wasInvokedThisFrame for exactly one tick on a press-then-release-inside', () => {
    const { mouseInputSource, tick, interactable } = setUp();

    let activations = 0;
    interactable().onInvoke.registerListener(() => (activations += 1));

    mouseInputSource.position = { x: 960, y: 540 };
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    tick();

    expect(interactable().isPressed).toBe(true);
    expect(activations).toBe(0);

    mouseInputSource.buttonsUp.add(mouseButtons.left);
    tick();

    expect(activations).toBe(1);
    expect(interactable().wasInvokedThisFrame).toBe(true);
    expect(interactable().isPressed).toBe(false);

    tick();

    expect(interactable().wasInvokedThisFrame).toBe(false);
  });

  it('handles a pointer entering and pressing in the same tick without dropping the press', () => {
    const { mouseInputSource, tick, interactable } = setUp();

    let enters = 0;
    let downs = 0;
    interactable().onPointerEnter.registerListener(() => (enters += 1));
    interactable().onPointerDown.registerListener(() => (downs += 1));

    mouseInputSource.position = { x: 960, y: 540 };
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    tick();

    expect(enters).toBe(1);
    expect(downs).toBe(1);
    expect(interactable().isHovered).toBe(true);
    expect(interactable().isPressed).toBe(true);
  });

  it('handles a press and release landing in the same tick without dropping the click', () => {
    const { mouseInputSource, tick, interactable } = setUp();

    let activations = 0;
    interactable().onInvoke.registerListener(() => (activations += 1));

    mouseInputSource.position = { x: 960, y: 540 };
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    mouseInputSource.buttonsUp.add(mouseButtons.left);
    tick();

    expect(activations).toBe(1);
    expect(interactable().wasInvokedThisFrame).toBe(true);
  });

  it('does not raise onInvoke when the pointer is released outside the element', () => {
    const { mouseInputSource, tick, interactable } = setUp();

    let activations = 0;
    interactable().onInvoke.registerListener(() => (activations += 1));

    // A huge drag threshold means moving off the rect doesn't count as a
    // drag - this isolates "released outside, not dragging" from the drag
    // path, which is covered separately below.
    interactable().dragThreshold = 100000;

    mouseInputSource.position = { x: 960, y: 540 };
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    tick();

    expect(interactable().isPressed).toBe(true);

    mouseInputSource.position = { x: 0, y: 0 };
    tick();

    expect(interactable().isPressed).toBe(false);
    expect(interactable().isHovered).toBe(false);

    mouseInputSource.buttonsUp.add(mouseButtons.left);
    tick();

    expect(activations).toBe(0);
  });

  it('raises onBeginDrag/onDrag/onEndDrag once a captured press exceeds dragThreshold, with no onInvoke', () => {
    const { mouseInputSource, tick, interactable } = setUp();

    let activations = 0;
    let beginDrags = 0;
    let drags = 0;
    let endDrags = 0;
    interactable().onInvoke.registerListener(() => (activations += 1));
    interactable().onBeginDrag.registerListener(() => (beginDrags += 1));
    interactable().onDrag.registerListener(() => (drags += 1));
    interactable().onEndDrag.registerListener(() => (endDrags += 1));
    interactable().dragThreshold = 10;

    mouseInputSource.position = { x: 960, y: 540 };
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    tick();

    expect(interactable().isDragging).toBe(false);

    // Move far enough (in UI world units) to exceed the drag threshold.
    mouseInputSource.position = { x: 960, y: 500 };
    tick();

    expect(interactable().isDragging).toBe(true);
    expect(beginDrags).toBe(1);
    expect(drags).toBe(1);

    mouseInputSource.buttonsUp.add(mouseButtons.left);
    tick();

    expect(endDrags).toBe(1);
    expect(activations).toBe(0);
    expect(interactable().isDragging).toBe(false);
  });

  it('focuses an interactable the pointer hovers, per canvas policy', () => {
    const { world, mouseInputSource, tick, canvas, panel, interactable } =
      setUp();

    mouseInputSource.position = { x: 960, y: 540 };
    tick();

    expect(world.getComponent(canvas, canvasId)!.focusedEntity).toBe(panel);
    expect(interactable().isFocused).toBe(true);
  });

  it('does not re-focus a still-hovered element on every tick, so it never fights a focus change made while the pointer sits still', () => {
    const { world, mouseInputSource, tick, canvas, panel } = setUp();
    const canvasComponent = world.getComponent(canvas, canvasId)!;

    // Placed well away from `panel` (which sits at the canvas center) so
    // the two never overlap - this test cares about a focus change made
    // some other way while the pointer stays put, not about which of two
    // overlapping elements the raycast happens to hit.
    const otherElement = world.createEntity();

    addPositionComponent(world, otherElement);
    addParentComponent(world, otherElement, { parent: canvas });
    addRectTransformComponent(world, otherElement, {
      ...UiAnchor.topLeft,
      sizeDelta: { x: 100, y: 100 },
    });
    addUiInteractableComponent(world, otherElement);

    mouseInputSource.position = { x: 960, y: 540 };
    tick();

    expect(canvasComponent.focusedEntity).toBe(panel);

    // Simulate a keyboard/gamepad navigation move to a different element,
    // made between ticks while the pointer hasn't budged from `panel`.
    setUiFocus(world, canvasComponent, otherElement);
    tick();

    expect(canvasComponent.focusedEntity).toBe(otherElement);
  });
});
