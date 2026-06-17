import { describe, expect, it } from 'vitest';
import { parentId } from '../../common/components/parent-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import { Renderable } from '../../rendering/renderable.js';
import { uiFocusableId } from '../components/ui-focusable-component.js';
import { uiInteractableId } from '../components/ui-interactable-component.js';
import { UiInstanceComponents } from '../components/ui-instance-components.js';
import { uiRenderableId } from '../components/ui-renderable-component.js';
import { uiStateId } from '../components/ui-state-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import {
  addUiChild,
  createUiElement,
  setUiParent,
} from './create-ui-element.js';

const mockRenderable = {} as Renderable<UiInstanceComponents>;

describe('createUiElement', () => {
  describe('transform', () => {
    it('always attaches a UiTransformEcsComponent', () => {
      const world = new EcsWorld();
      const { entity, transform } = createUiElement(world, {});

      expect(transform).not.toBeNull();
      expect(world.getComponent(entity, uiTransformId)).toBe(transform);
    });

    it('applies rect via setUiRect when rect is provided', () => {
      const world = new EcsWorld();
      const { transform } = createUiElement(world, {
        rect: { x: 10, y: 20, width: 200, height: 80 },
      });

      expect(transform.offsetMin.x).toBe(10);
      expect(transform.offsetMin.y).toBe(20);
      expect(transform.offsetMax.x).toBe(210);
      expect(transform.offsetMax.y).toBe(100);
    });

    it('applies offsetMin/offsetMax in stretch mode', () => {
      const world = new EcsWorld();
      const { transform } = createUiElement(world, {
        anchorMin: new Vector2(0, 0),
        anchorMax: new Vector2(1, 1),
        offsetMin: new Vector2(5, 5),
        offsetMax: new Vector2(-5, -5),
      });

      expect(transform.offsetMin.x).toBe(5);
      expect(transform.offsetMax.x).toBe(-5);
    });

    it('uses provided anchorMin, anchorMax, pivot, rotation, scale', () => {
      const world = new EcsWorld();
      const { transform } = createUiElement(world, {
        anchorMin: new Vector2(0.5, 0.5),
        anchorMax: new Vector2(0.5, 0.5),
        pivot: new Vector2(0.5, 0.5),
        rotation: Math.PI / 4,
        scale: new Vector2(2, 2),
      });

      expect(transform.anchorMin.x).toBe(0.5);
      expect(transform.pivot.x).toBe(0.5);
      expect(transform.rotation).toBeCloseTo(Math.PI / 4);
      expect(transform.scale.x).toBe(2);
    });
  });

  describe('renderable', () => {
    it('does not attach a renderable when style is absent', () => {
      const world = new EcsWorld();
      const { entity, renderable } = createUiElement(world, {});

      expect(renderable).toBeNull();
      expect(world.getComponent(entity, uiRenderableId)).toBeNull();
    });

    it('attaches a renderable with default style values when style is provided', () => {
      const world = new EcsWorld();
      const { entity, renderable } = createUiElement(world, {
        style: { renderable: mockRenderable },
      });

      expect(renderable).not.toBeNull();
      expect(world.getComponent(entity, uiRenderableId)).toBe(renderable);
      expect(renderable!.tintColor).toEqual(Color.white);
      expect(renderable!.opacity).toBe(1);
    });

    it('attaches a renderable with provided style values', () => {
      const world = new EcsWorld();
      const tint = new Color(1, 0, 0);
      const { renderable } = createUiElement(world, {
        style: {
          renderable: mockRenderable,
          tintColor: tint,
          borderWidth: 2,
          cornerRadius: 8,
          zIndex: 5,
        },
      });

      expect(renderable!.tintColor).toBe(tint);
      expect(renderable!.borderWidth).toBe(2);
      expect(renderable!.cornerRadius).toBe(8);
      expect(renderable!.zIndex).toBe(5);
    });
  });

  describe('interactable', () => {
    it('does not attach interaction components when interactable is absent', () => {
      const world = new EcsWorld();
      const { entity, state } = createUiElement(world, {});

      expect(state).toBeNull();
      expect(world.getComponent(entity, uiInteractableId)).toBeNull();
      expect(world.getComponent(entity, uiStateId)).toBeNull();
    });

    it('attaches UiInteractableEcsComponent and UiStateEcsComponent when interactable is provided', () => {
      const world = new EcsWorld();
      const { entity, state } = createUiElement(world, {
        interactable: {},
      });

      expect(state).not.toBeNull();
      expect(world.getComponent(entity, uiInteractableId)).not.toBeNull();
      expect(world.getComponent(entity, uiStateId)).toBe(state);
    });

    it('marks the entity as disabled when interactable.disabled is true', () => {
      const world = new EcsWorld();
      const { entity, state } = createUiElement(world, {
        interactable: { disabled: true },
      });

      const interactable = world.getComponent(entity, uiInteractableId)!;

      expect(state!.disabled).toBe(true);
      expect(interactable.enabled).toBe(false);
    });

    it('respects blocksPointer option', () => {
      const world = new EcsWorld();
      const { entity } = createUiElement(world, {
        interactable: { blocksPointer: false },
      });

      const interactable = world.getComponent(entity, uiInteractableId)!;

      expect(interactable.blocksPointer).toBe(false);
    });
  });

  describe('focusable', () => {
    it('does not attach UiFocusableEcsComponent when focusable is absent', () => {
      const world = new EcsWorld();
      const { entity } = createUiElement(world, {});

      expect(world.getComponent(entity, uiFocusableId)).toBeNull();
    });

    it('attaches UiFocusableEcsComponent and interaction components when focusable is provided', () => {
      const world = new EcsWorld();
      const { entity, state } = createUiElement(world, {
        focusable: { tabIndex: 2 },
      });

      const focusable = world.getComponent(entity, uiFocusableId)!;

      expect(focusable).not.toBeNull();
      expect(focusable.tabIndex).toBe(2);
      expect(focusable.focusable).toBe(true);
      expect(world.getComponent(entity, uiInteractableId)).not.toBeNull();
      expect(state).not.toBeNull();
    });

    it('uses tabIndex 0 as default', () => {
      const world = new EcsWorld();
      const { entity } = createUiElement(world, {
        focusable: {},
      });

      const focusable = world.getComponent(entity, uiFocusableId)!;

      expect(focusable.tabIndex).toBe(0);
    });
  });

  describe('parent', () => {
    it('does not attach ParentEcsComponent when parent is absent', () => {
      const world = new EcsWorld();
      const { entity } = createUiElement(world, {});

      expect(world.getComponent(entity, parentId)).toBeNull();
    });

    it('attaches ParentEcsComponent when parent is provided', () => {
      const world = new EcsWorld();
      const parentEntity = world.createEntity();
      const { entity } = createUiElement(world, { parent: parentEntity });

      const comp = world.getComponent(entity, parentId)!;

      expect(comp.parent).toBe(parentEntity);
    });
  });
});

describe('addUiChild', () => {
  it('attaches a ParentEcsComponent pointing to the parent', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const child = world.createEntity();

    addUiChild(world, parent, child);

    expect(world.getComponent(child, parentId)?.parent).toBe(parent);
  });

  it('replaces an existing parent', () => {
    const world = new EcsWorld();
    const parent1 = world.createEntity();
    const parent2 = world.createEntity();
    const child = world.createEntity();

    addUiChild(world, parent1, child);
    addUiChild(world, parent2, child);

    expect(world.getComponent(child, parentId)?.parent).toBe(parent2);
  });
});

describe('setUiParent', () => {
  it('adds a ParentEcsComponent when the child has none', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const child = world.createEntity();

    setUiParent(world, child, parent);

    expect(world.getComponent(child, parentId)?.parent).toBe(parent);
  });

  it('updates the parent field in place when the child already has a parent', () => {
    const world = new EcsWorld();
    const parent1 = world.createEntity();
    const parent2 = world.createEntity();
    const child = world.createEntity();

    setUiParent(world, child, parent1);
    const comp = world.getComponent(child, parentId)!;

    setUiParent(world, child, parent2);

    expect(comp.parent).toBe(parent2);
    expect(world.getComponent(child, parentId)).toBe(comp);
  });
});
