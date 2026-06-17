import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world';
import { Vector2 } from '../../math/index';
import { Renderable } from '../../rendering/renderable';
import { UiInstanceComponents } from '../components/ui-instance-components';
import { uiClipId } from '../components/ui-clip-component';
import { uiInteractableId } from '../components/ui-interactable-component';
import { uiScrollId } from '../components/ui-scroll-component';
import { uiTransformId } from '../components/ui-transform-component';
import { createUiScrollGroup } from './create-ui-scroll-group';

const mockRenderable = {} as Renderable<UiInstanceComponents>;

describe('createUiScrollGroup', () => {
  it('creates viewport entity with clip and interactable components', () => {
    const world = new EcsWorld();

    const { entity } = createUiScrollGroup(world, {
      renderable: mockRenderable,
      contentRenderable: mockRenderable,
      rect: { x: 0, y: 0, width: 300, height: 200 },
      contentSize: new Vector2(300, 600),
    });

    expect(world.getComponent(entity, uiClipId)).toBeTruthy();
    expect(world.getComponent(entity, uiInteractableId)).toBeTruthy();
  });

  it('creates content entity as child of viewport', () => {
    const world = new EcsWorld();
    const { entity, contentEntity } = createUiScrollGroup(world, {
      renderable: mockRenderable,
      contentRenderable: mockRenderable,
      rect: { x: 0, y: 0, width: 300, height: 200 },
      contentSize: new Vector2(300, 600),
    });

    expect(contentEntity).not.toBe(entity);
    const contentTransform = world.getComponent(contentEntity, uiTransformId);
    expect(contentTransform).toBeTruthy();
    // Content stretches to full width (anchorMax.x = 1)
    expect(contentTransform!.anchorMax.x).toBe(1);
    // Content offsetMax.y matches contentSize.y
    expect(contentTransform!.offsetMax.y).toBe(600);
  });

  it('attaches UiScrollEcsComponent to viewport entity', () => {
    const world = new EcsWorld();
    const contentSize = new Vector2(300, 800);
    const { entity, scroll } = createUiScrollGroup(world, {
      renderable: mockRenderable,
      contentRenderable: mockRenderable,
      rect: { x: 0, y: 0, width: 300, height: 200 },
      contentSize,
    });

    const comp = world.getComponent(entity, uiScrollId);
    expect(comp).toBeTruthy();
    expect(comp!.scroll.y).toBe(0);
    expect(comp!.contentSize.y).toBe(800);
    expect(comp!.contentEntity).toBe(scroll.contentEntity);
  });

  it('defaults orientation to vertical', () => {
    const world = new EcsWorld();
    const { scroll } = createUiScrollGroup(world, {
      renderable: mockRenderable,
      contentRenderable: mockRenderable,
      rect: { x: 0, y: 0, width: 300, height: 200 },
      contentSize: new Vector2(300, 600),
    });

    expect(scroll.orientation).toBe('vertical');
  });

  it('creates scrollbar entities when showScrollbar is true', () => {
    const world = new EcsWorld();
    const { scroll } = createUiScrollGroup(world, {
      renderable: mockRenderable,
      contentRenderable: mockRenderable,
      scrollbarRenderable: mockRenderable,
      rect: { x: 0, y: 0, width: 300, height: 200 },
      contentSize: new Vector2(300, 600),
      showScrollbar: true,
    });

    expect(scroll.scrollbarEntity).toBeDefined();
    expect(scroll.thumbEntity).toBeDefined();
  });

  it('does not create scrollbar entities by default', () => {
    const world = new EcsWorld();
    const { scroll } = createUiScrollGroup(world, {
      renderable: mockRenderable,
      contentRenderable: mockRenderable,
      rect: { x: 0, y: 0, width: 300, height: 200 },
      contentSize: new Vector2(300, 600),
    });

    expect(scroll.scrollbarEntity).toBeUndefined();
    expect(scroll.thumbEntity).toBeUndefined();
  });

  it('registers onScroll listener', () => {
    const world = new EcsWorld();
    const received: number[] = [];

    createUiScrollGroup(world, {
      renderable: mockRenderable,
      contentRenderable: mockRenderable,
      rect: { x: 0, y: 0, width: 300, height: 200 },
      contentSize: new Vector2(300, 600),
      onScroll: (e) => received.push(e.entity),
    });

    expect(received).toHaveLength(0);
  });

  it('destroy removes all entities', () => {
    const world = new EcsWorld();
    const { entity, contentEntity, destroy } = createUiScrollGroup(world, {
      renderable: mockRenderable,
      contentRenderable: mockRenderable,
      rect: { x: 0, y: 0, width: 300, height: 200 },
      contentSize: new Vector2(300, 600),
    });

    destroy();

    expect(world.getComponent(entity, uiScrollId)).toBeNull();
    expect(world.getComponent(contentEntity, uiTransformId)).toBeNull();
  });
});
