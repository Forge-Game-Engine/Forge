import { describe, expect, it } from 'vitest';
import { createUiTransitionEcsSystem } from './ui-transition-system.js';
import { Time } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addSpriteComponent,
  Color,
  spriteId,
  Texture,
} from '../../rendering/index.js';
import { addUiColorTransitionComponent } from '../components/ui-color-transition-component.js';
import { addUiInteractableComponent } from '../components/ui-interactable-component.js';
import {
  easeInOutBack,
  linear,
} from '../../animations/easing-functions/index.js';

const buildTexture = (): Texture => ({}) as Texture;

const buildTime = (deltaTimeInMilliseconds: number): Time =>
  ({ deltaTimeInMilliseconds }) as Time;

describe('createUiTransitionEcsSystem', () => {
  it('starts fully eased into normalColor for a fresh entity', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const normalColor = new Color(0.5, 0.5, 0.5, 1);

    addUiInteractableComponent(world, entity);
    addSpriteComponent(world, entity, {
      width: 1,
      height: 1,
      texture: buildTexture(),
    });
    addUiColorTransitionComponent(world, entity, { normalColor });

    world.addSystem(createUiTransitionEcsSystem(buildTime(16)));
    world.update();

    expect(world.getComponent(entity, spriteId)!.tintColor).toEqual(
      normalColor,
    );
  });

  it('eases the tint towards hoverColor over duration when hovered', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const normalColor = new Color(0, 0, 0, 1);
    const hoverColor = new Color(1, 1, 1, 1);

    const interactable = addUiInteractableComponent(world, entity);
    addSpriteComponent(world, entity, {
      width: 1,
      height: 1,
      texture: buildTexture(),
      tintColor: normalColor,
    });
    addUiColorTransitionComponent(world, entity, {
      normalColor,
      hoverColor,
      duration: 100,
      easing: linear,
    });

    interactable.isHovered = true;

    world.addSystem(createUiTransitionEcsSystem(buildTime(50)));
    world.update();

    const halfway = world.getComponent(entity, spriteId)!.tintColor;

    expect(halfway.r).toBeCloseTo(0.5);
    expect(halfway.g).toBeCloseTo(0.5);
    expect(halfway.b).toBeCloseTo(0.5);

    world.update();

    const done = world.getComponent(entity, spriteId)!.tintColor;

    expect(done.r).toBeCloseTo(1);
    expect(done.g).toBeCloseTo(1);
    expect(done.b).toBeCloseTo(1);
  });

  it('brightens the tint past white, and past hoverColor while an easing overshoots', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const hoverColor = new Color(1.2, 1.2, 1.2, 1);

    const interactable = addUiInteractableComponent(world, entity);
    addSpriteComponent(world, entity, {
      width: 1,
      height: 1,
      texture: buildTexture(),
    });
    addUiColorTransitionComponent(world, entity, {
      hoverColor,
      duration: 100,
      easing: easeInOutBack,
    });

    interactable.isHovered = true;

    world.addSystem(createUiTransitionEcsSystem(buildTime(80)));
    world.update();

    const overshooting = world.getComponent(entity, spriteId)!.tintColor;

    expect(overshooting.r).toBeCloseTo(1 + 0.2 * easeInOutBack(0.8));
    expect(overshooting.r).toBeGreaterThan(hoverColor.r);

    world.update();

    expect(world.getComponent(entity, spriteId)!.tintColor.r).toBeCloseTo(
      hoverColor.r,
    );
  });

  it('restarts the tween from the color actually on screen when the state changes mid-tween', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const normalColor = new Color(0, 0, 0, 1);
    const hoverColor = new Color(1, 1, 1, 1);
    const pressedColor = new Color(0, 0, 1, 1);

    const interactable = addUiInteractableComponent(world, entity);
    addSpriteComponent(world, entity, {
      width: 1,
      height: 1,
      texture: buildTexture(),
      tintColor: normalColor,
    });
    addUiColorTransitionComponent(world, entity, {
      normalColor,
      hoverColor,
      pressedColor,
      duration: 100,
      easing: linear,
    });

    interactable.isHovered = true;

    const system = createUiTransitionEcsSystem(buildTime(50));
    world.addSystem(system);
    world.update();

    const midHoverTint = world.getComponent(entity, spriteId)!.tintColor;

    // Press mid-tween: the new tween should start from `midHoverTint`, not
    // snap back to `normalColor` or jump straight to `pressedColor`.
    interactable.isPressed = true;
    world.update();

    const afterStateChange = world.getComponent(entity, spriteId)!.tintColor;

    expect(afterStateChange.b).toBeGreaterThan(midHoverTint.b);
    expect(afterStateChange.b).toBeLessThan(pressedColor.b);
  });

  it('shows disabledColor when the interactable is not interactable, regardless of hover/press', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const normalColor = new Color(0, 0, 0, 1);
    const disabledColor = new Color(0.3, 0.3, 0.3, 1);

    const interactable = addUiInteractableComponent(world, entity, {
      interactable: false,
    });
    addSpriteComponent(world, entity, {
      width: 1,
      height: 1,
      texture: buildTexture(),
      tintColor: normalColor,
    });
    addUiColorTransitionComponent(world, entity, {
      normalColor,
      disabledColor,
      duration: 0,
    });

    interactable.isHovered = true;

    world.addSystem(createUiTransitionEcsSystem(buildTime(16)));
    world.update();

    expect(world.getComponent(entity, spriteId)!.tintColor).toEqual(
      disabledColor,
    );
  });
});
