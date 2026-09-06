import { describe, expect, it } from 'vitest';
import { createUiInteractionEcsSystem } from './ui-interaction-system.js';
import { createUiLayoutEcsSystem } from './ui-layout-system.js';
import { createUiNavigationEcsSystem } from './ui-navigation-system.js';
import { createUiRaycastEcsSystem } from './ui-raycast-system.js';
import { createUiSliderEcsSystem } from './ui-slider-system.js';
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
import { addCanvasComponent } from '../components/canvas-component.js';
import {
  addRectTransformComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { addUiInteractableComponent } from '../components/ui-interactable-component.js';
import { addUiSliderComponent } from '../components/ui-slider-component.js';
import { UiAnchor } from '../types/ui-anchor.js';
import { UiAxis, UiStretchAxis } from '../types/ui-axis.js';

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

describe('createUiSliderEcsSystem', () => {
  const setUp = (
    sliderOptions: {
      minValue?: number;
      maxValue?: number;
      wholeNumbers?: boolean;
    } = {},
  ) => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const mouseInputSource = buildMouseInputSource();

    const camera = world.createEntity();
    addPositionComponent(world, camera);
    addCameraComponent(world, camera, { verticalWorldUnits: 1080 });

    const canvas = world.createEntity();
    addPositionComponent(world, canvas);
    addRectTransformComponent(world, canvas);
    addCanvasComponent(world, canvas, { camera });

    const track = world.createEntity();
    addPositionComponent(world, track);
    addParentComponent(world, track, { parent: canvas });
    addRectTransformComponent(world, track, UiAnchor.center({ x: 300, y: 24 }));
    const interactable = addUiInteractableComponent(world, track, {
      dragThreshold: 0,
    });

    const handle = world.createEntity();
    addPositionComponent(world, handle);
    addParentComponent(world, handle, { parent: track });
    addRectTransformComponent(world, handle, {
      x: UiAxis.point(0, { pivot: 0.5, size: 24 }),
      y: UiAxis.point(0.5, { size: 24 }),
    });

    const slider = addUiSliderComponent(world, track, {
      handle,
      ...sliderOptions,
    });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.addSystem(createUiRaycastEcsSystem(mouseInputSource, renderContext));
    world.addSystem(createUiNavigationEcsSystem());
    world.addSystem(
      createUiInteractionEcsSystem(mouseInputSource, renderContext),
    );
    world.addSystem(createUiSliderEcsSystem(mouseInputSource, renderContext));

    const tick = () => {
      world.update();
      mouseInputSource.buttonsDown.clear();
      mouseInputSource.buttonsUp.clear();
    };

    const handleRectTransform = () =>
      world.getComponent(handle, rectTransformId)!;

    return {
      world,
      mouseInputSource,
      interactable,
      slider,
      tick,
      handleRectTransform,
    };
  };

  it('does nothing while there is no active press', () => {
    const { tick, slider } = setUp();

    tick();

    expect(slider.value).toBe(0);
  });

  it('jumps the value to the click position on a plain click, without needing a drag', () => {
    const { mouseInputSource, tick, slider } = setUp();

    // The track spans world x [-150, 150] at this render size/anchor - the
    // right edge is screen x 960 (canvas center) + 150.
    mouseInputSource.position = { x: 1110, y: 540 };
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    tick();

    expect(slider.value).toBeCloseTo(1);
  });

  it('tracks the drag continuously as the pointer moves', () => {
    const { mouseInputSource, tick, slider } = setUp();

    mouseInputSource.position = { x: 810, y: 540 }; // left edge -> 0
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    tick();

    expect(slider.value).toBeCloseTo(0);

    mouseInputSource.position = { x: 960, y: 540 }; // center -> 0.5
    tick();

    expect(slider.value).toBeCloseTo(0.5);

    mouseInputSource.position = { x: 1110, y: 540 }; // right edge -> 1
    tick();

    expect(slider.value).toBeCloseTo(1);

    // Releasing without moving further shouldn't change the value.
    mouseInputSource.buttonsUp.add(mouseButtons.left);
    tick();

    expect(slider.value).toBeCloseTo(1);
  });

  it('keeps tracking a drag that strays outside the track vertically', () => {
    const { mouseInputSource, tick, slider } = setUp();

    mouseInputSource.position = { x: 960, y: 540 };
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    tick();

    expect(slider.value).toBeCloseTo(0.5);

    // Far above the track's y bounds, but the press is still captured.
    mouseInputSource.position = { x: 1110, y: 0 };
    tick();

    expect(slider.value).toBeCloseTo(1);
  });

  it('clamps beyond the track edges once a press has begun inside it', () => {
    const { mouseInputSource, tick, slider } = setUp();

    // The down edge has to land inside the track to begin a press at all -
    // begin one at the center, then drag past the right edge.
    mouseInputSource.position = { x: 960, y: 540 };
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    tick();

    mouseInputSource.position = { x: 2000, y: 540 };
    tick();

    expect(slider.value).toBe(1);
  });

  it('rounds to whole numbers when wholeNumbers is set', () => {
    const { mouseInputSource, tick, slider } = setUp({
      minValue: 0,
      maxValue: 10,
      wholeNumbers: true,
    });

    // 40% across the track.
    mouseInputSource.position = { x: 810 + 300 * 0.44, y: 540 };
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    tick();

    expect(slider.value).toBe(4);
  });

  it('drives the handle anchor from value every tick, including an external write', () => {
    const { tick, slider, handleRectTransform } = setUp();

    slider.value = 0.25;
    tick();

    expect((handleRectTransform().x as { anchor: number }).anchor).toBeCloseTo(
      0.25,
    );
  });

  it("also drives a fill entity's x.anchorMax, when one is given", () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const mouseInputSource = buildMouseInputSource();

    const camera = world.createEntity();
    addPositionComponent(world, camera);
    addCameraComponent(world, camera, { verticalWorldUnits: 1080 });

    const canvas = world.createEntity();
    addPositionComponent(world, canvas);
    addRectTransformComponent(world, canvas);
    addCanvasComponent(world, canvas, { camera });

    const track = world.createEntity();
    addPositionComponent(world, track);
    addParentComponent(world, track, { parent: canvas });
    addRectTransformComponent(world, track, UiAnchor.center({ x: 300, y: 24 }));
    addUiInteractableComponent(world, track, { dragThreshold: 0 });

    const handle = world.createEntity();
    addPositionComponent(world, handle);
    addParentComponent(world, handle, { parent: track });
    addRectTransformComponent(world, handle, {
      x: UiAxis.point(0, { pivot: 0.5, size: 24 }),
      y: UiAxis.point(0.5, { size: 24 }),
    });

    const fill = world.createEntity();
    addPositionComponent(world, fill);
    addParentComponent(world, fill, { parent: track });
    addRectTransformComponent(world, fill, {
      x: UiAxis.stretch({ min: 0, max: 0 }, { pivot: 0 }),
      y: UiAxis.stretch({ min: 0, max: 1 }, { pivot: 0.5 }),
    });

    addUiSliderComponent(world, track, { handle, fill });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.addSystem(createUiRaycastEcsSystem(mouseInputSource, renderContext));
    world.addSystem(createUiNavigationEcsSystem());
    world.addSystem(
      createUiInteractionEcsSystem(mouseInputSource, renderContext),
    );
    world.addSystem(createUiSliderEcsSystem(mouseInputSource, renderContext));

    mouseInputSource.position = { x: 1110, y: 540 }; // right edge -> 1
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    world.update();

    expect(
      (world.getComponent(fill, rectTransformId)!.x as UiStretchAxis).anchorMax,
    ).toBeCloseTo(1);
  });

  it('does nothing (and does not throw) when a press is captured on a track with no owning canvas', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const mouseInputSource = buildMouseInputSource();

    const track = world.createEntity();
    addPositionComponent(world, track);
    addRectTransformComponent(world, track, UiAnchor.center({ x: 300, y: 24 }));
    const interactable = addUiInteractableComponent(world, track, {
      dragThreshold: 0,
    });

    const handle = world.createEntity();
    addPositionComponent(world, handle);
    addParentComponent(world, handle, { parent: track });
    addRectTransformComponent(world, handle, {
      x: UiAxis.point(0, { pivot: 0.5, size: 24 }),
      y: UiAxis.point(0.5, { size: 24 }),
    });

    const slider = addUiSliderComponent(world, track, { handle });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.addSystem(createUiSliderEcsSystem(mouseInputSource, renderContext));

    // Simulates a press without a raycast/interaction pipeline ever running
    // (no canvas ancestor for findOwningCanvas to resolve).
    interactable.pressCapture = { originPosition: { x: 0, y: 0 } };

    expect(() => world.update()).not.toThrow();
    expect(slider.value).toBe(0);
  });

  it('raises onValueChanged exactly when the value actually changes', () => {
    const { mouseInputSource, tick, slider } = setUp();

    let changes = 0;
    slider.onValueChanged.registerListener(() => (changes += 1));

    tick();
    expect(changes).toBe(0);

    mouseInputSource.position = { x: 960, y: 540 };
    mouseInputSource.buttonsDown.add(mouseButtons.left);
    tick();

    expect(changes).toBe(1);

    tick();
    expect(changes).toBe(1);
  });
});
