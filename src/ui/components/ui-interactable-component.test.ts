import { describe, expect, it } from 'vitest';
import {
  addUiInteractableComponent,
  uiInteractableId,
} from './ui-interactable-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { ForgeEvent } from '../../events/index.js';

describe('addUiInteractableComponent', () => {
  it('attaches a component with default values for unspecified options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiInteractableComponent(world, entity);

    expect(component.interactable).toBe(true);
    expect(component.blocksRaycasts).toBe(true);
    expect(component.dragThreshold).toBe(8);

    expect(component.isHovered).toBe(false);
    expect(component.isFocused).toBe(false);
    expect(component.isPressed).toBe(false);
    expect(component.isDragging).toBe(false);
    expect(component.wasInvokedThisFrame).toBe(false);
    expect(component.pressCapture).toBeNull();

    expect(component.onInvoke).toBeInstanceOf(ForgeEvent);
    expect(component.onPointerEnter).toBeInstanceOf(ForgeEvent);
    expect(component.onPointerExit).toBeInstanceOf(ForgeEvent);
    expect(component.onPointerDown).toBeInstanceOf(ForgeEvent);
    expect(component.onPointerUp).toBeInstanceOf(ForgeEvent);
    expect(component.onBeginDrag).toBeInstanceOf(ForgeEvent);
    expect(component.onDrag).toBeInstanceOf(ForgeEvent);
    expect(component.onEndDrag).toBeInstanceOf(ForgeEvent);

    expect(world.getComponent(entity, uiInteractableId)).toBe(component);
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiInteractableComponent(world, entity, {
      interactable: false,
      dragThreshold: 20,
    });

    expect(component.interactable).toBe(false);
    expect(component.dragThreshold).toBe(20);
    expect(component.blocksRaycasts).toBe(true);
  });

  it('gives each entity its own independent events', () => {
    const world = new EcsWorld();
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    const componentA = addUiInteractableComponent(world, entityA);
    const componentB = addUiInteractableComponent(world, entityB);

    let calls = 0;
    componentA.onInvoke.registerListener(() => {
      calls += 1;
    });

    componentB.onInvoke.raise();

    expect(calls).toBe(0);
  });
});
