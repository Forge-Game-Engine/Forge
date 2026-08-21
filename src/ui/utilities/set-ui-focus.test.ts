import { describe, expect, it } from 'vitest';
import { setUiFocus } from './set-ui-focus.js';
import { EcsWorld } from '../../ecs/index.js';
import { CanvasEcsComponent } from '../components/canvas-component.js';
import { addUiInteractableComponent } from '../components/ui-interactable-component.js';

const buildCanvas = (focusedEntity: number | null = null): CanvasEcsComponent =>
  ({ focusedEntity }) as CanvasEcsComponent;

describe('setUiFocus', () => {
  it('focuses an entity, marking its interactable isFocused', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const interactable = addUiInteractableComponent(world, entity);
    const canvas = buildCanvas();

    setUiFocus(world, canvas, entity);

    expect(canvas.focusedEntity).toBe(entity);
    expect(interactable.isFocused).toBe(true);
  });

  it('un-focuses the previous entity when focus moves', () => {
    const world = new EcsWorld();
    const entityA = world.createEntity();
    const entityB = world.createEntity();
    const interactableA = addUiInteractableComponent(world, entityA);
    const interactableB = addUiInteractableComponent(world, entityB);
    const canvas = buildCanvas();

    setUiFocus(world, canvas, entityA);
    setUiFocus(world, canvas, entityB);

    expect(canvas.focusedEntity).toBe(entityB);
    expect(interactableA.isFocused).toBe(false);
    expect(interactableB.isFocused).toBe(true);
  });

  it('clears focus when given null', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const interactable = addUiInteractableComponent(world, entity);
    const canvas = buildCanvas();

    setUiFocus(world, canvas, entity);
    setUiFocus(world, canvas, null);

    expect(canvas.focusedEntity).toBeNull();
    expect(interactable.isFocused).toBe(false);
  });

  it('is a no-op when the entity is already focused', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const interactable = addUiInteractableComponent(world, entity);
    const canvas = buildCanvas();

    setUiFocus(world, canvas, entity);
    interactable.isFocused = true;
    setUiFocus(world, canvas, entity);

    expect(canvas.focusedEntity).toBe(entity);
    expect(interactable.isFocused).toBe(true);
  });
});
