import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world';
import { Vector2 } from '../../math/index';
import { Color } from '../../rendering/color';
import { Renderable } from '../../rendering/renderable';
import { uiClipId } from '../components/ui-clip-component';
import { UiInstanceComponents } from '../components/ui-instance-components';
import { uiFocusableId } from '../components/ui-focusable-component';
import { uiInteractableId } from '../components/ui-interactable-component';
import { uiRenderableId } from '../components/ui-renderable-component';
import { uiStateId } from '../components/ui-state-component';
import { uiTransformId } from '../components/ui-transform-component';
import { createUiPanel } from './create-ui-panel';
import { parentId } from '../../common/components/parent-component';

const mockRenderable = {} as Renderable<UiInstanceComponents>;

describe('createUiPanel', () => {
  describe('core entity assembly', () => {
    it('creates an entity with a transform and renderable', () => {
      const world = new EcsWorld();
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        rect: { x: 0, y: 0, width: 100, height: 50 },
      });

      expect(world.getComponent(entity, uiTransformId)).toBeTruthy();
      expect(world.getComponent(entity, uiRenderableId)).toBeTruthy();
    });

    it('applies rect to offsetMin/offsetMax', () => {
      const world = new EcsWorld();
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        rect: { x: 10, y: 20, width: 200, height: 80 },
      });

      const transform = world.getComponent(entity, uiTransformId)!;

      expect(transform.offsetMin.x).toBe(10);
      expect(transform.offsetMin.y).toBe(20);
      expect(transform.offsetMax.x).toBe(210);
      expect(transform.offsetMax.y).toBe(100);
    });

    it('applies direct offsetMin/offsetMax when rect is absent', () => {
      const world = new EcsWorld();
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        anchorMin: new Vector2(0, 0),
        anchorMax: new Vector2(1, 1),
        offsetMin: new Vector2(10, 10),
        offsetMax: new Vector2(-10, -10),
      });

      const transform = world.getComponent(entity, uiTransformId)!;

      expect(transform.offsetMin.x).toBe(10);
      expect(transform.offsetMax.x).toBe(-10);
    });

    it('applies style options to the renderable', () => {
      const world = new EcsWorld();
      const tint = Color.blue;
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        tintColor: tint,
        borderWidth: 2,
        cornerRadius: 8,
        opacity: 0.8,
        zIndex: 5,
      });

      const r = world.getComponent(entity, uiRenderableId)!;

      expect(r.tintColor).toBe(tint);
      expect(r.borderWidth).toBe(2);
      expect(r.cornerRadius).toBe(8);
      expect(r.opacity).toBe(0.8);
      expect(r.zIndex).toBe(5);
    });

    it('attaches a parent component when parent option is set', () => {
      const world = new EcsWorld();
      const parentEntity = world.createEntity();
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        parent: parentEntity,
      });

      const p = world.getComponent(entity, parentId)!;

      expect(p.parent).toBe(parentEntity);
    });
  });

  describe('clipping', () => {
    it('does not attach a clip component by default', () => {
      const world = new EcsWorld();
      const { entity } = createUiPanel(world, { renderable: mockRenderable });

      expect(world.getComponent(entity, uiClipId)).toBeNull();
    });

    it('attaches a clip component when clip is true', () => {
      const world = new EcsWorld();
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        clip: true,
      });

      const clip = world.getComponent(entity, uiClipId)!;

      expect(clip).toBeTruthy();
      expect(clip.enabled).toBe(true);
    });
  });

  describe('interactability', () => {
    it('does not attach interaction components by default', () => {
      const world = new EcsWorld();
      const { entity } = createUiPanel(world, { renderable: mockRenderable });

      expect(world.getComponent(entity, uiInteractableId)).toBeNull();
      expect(world.getComponent(entity, uiStateId)).toBeNull();
    });

    it('attaches interactable and state when interactable is true', () => {
      const world = new EcsWorld();
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        interactable: true,
      });

      expect(world.getComponent(entity, uiInteractableId)).toBeTruthy();
      expect(world.getComponent(entity, uiStateId)).toBeTruthy();
    });

    it('attaches focusable when focusable is true', () => {
      const world = new EcsWorld();
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        focusable: true,
      });

      const focusable = world.getComponent(entity, uiFocusableId)!;

      expect(focusable).toBeTruthy();
      expect(focusable.focusable).toBe(true);
    });

    it('does not attach focusable unless the option is set', () => {
      const world = new EcsWorld();
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        interactable: true,
      });

      expect(world.getComponent(entity, uiFocusableId)).toBeNull();
    });

    it('disables interactable when disabled is true', () => {
      const world = new EcsWorld();
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        interactable: true,
        disabled: true,
      });

      const interactable = world.getComponent(entity, uiInteractableId)!;

      expect(interactable.enabled).toBe(false);
    });
  });

  describe('state style transitions', () => {
    it('updates renderable style on hover enter', () => {
      const world = new EcsWorld();
      const hoverTint = new Color(0.5, 0.5, 0.5);
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        interactable: true,
        tintColor: Color.white,
        stateStyles: { hover: { tintColor: hoverTint } },
      });

      const state = world.getComponent(entity, uiStateId)!;
      const r = world.getComponent(entity, uiRenderableId)!;

      expect(r.tintColor).toBe(Color.white);

      state.hovered = true;
      state.onHoverEnter.raise({
        entity,
        pointer: { x: 0, y: 0 } as never,
        source: 'pointer',
      });

      expect(r.tintColor).toBe(hoverTint);
    });

    it('reverts style on hover exit', () => {
      const world = new EcsWorld();
      const hoverTint = new Color(0.5, 0.5, 0.5);
      const { entity } = createUiPanel(world, {
        renderable: mockRenderable,
        interactable: true,
        tintColor: Color.white,
        stateStyles: { hover: { tintColor: hoverTint } },
      });

      const state = world.getComponent(entity, uiStateId)!;
      const r = world.getComponent(entity, uiRenderableId)!;

      state.hovered = true;
      state.onHoverEnter.raise({
        entity,
        pointer: { x: 0, y: 0 } as never,
        source: 'pointer',
      });

      state.hovered = false;
      state.onHoverExit.raise({
        entity,
        pointer: { x: 0, y: 0 } as never,
        source: 'pointer',
      });

      expect(r.tintColor).toBe(Color.white);
    });
  });
});
