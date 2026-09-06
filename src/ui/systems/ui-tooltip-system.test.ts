import { describe, expect, it } from 'vitest';
import { createUiTooltipEcsSystem } from './ui-tooltip-system.js';
import { Time } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addSpriteComponent,
  Renderable,
  spriteId,
} from '../../rendering/index.js';
import { addTextComponent, textId } from '../../text/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import { addTooltipComponent } from '../components/tooltip-component.js';
import { addUiInteractableComponent } from '../components/ui-interactable-component.js';

const buildRenderable = (): Renderable => ({}) as Renderable;

const buildTime = (deltaTimeInMilliseconds: number): Time =>
  ({ deltaTimeInMilliseconds }) as Time;

function buildScene(world: EcsWorld) {
  const source = world.createEntity();
  const interactable = addUiInteractableComponent(world, source);

  const panel = world.createEntity();

  addSpriteComponent(world, panel, {
    width: 10,
    height: 10,
    renderable: buildRenderable(),
  });

  const label = world.createEntity();

  addTextComponent(world, label, {
    text: 'hi',
    fontAtlas: {} as FontAtlas,
    size: 16,
  });

  addTooltipComponent(world, source, {
    panel,
    label,
    showDelayMilliseconds: 100,
  });

  return { source, interactable, panel, label };
}

describe('createUiTooltipEcsSystem', () => {
  it('starts hidden', () => {
    const world = new EcsWorld();
    const { panel, label } = buildScene(world);

    world.addSystem(createUiTooltipEcsSystem(buildTime(16)));
    world.update();

    expect(world.getComponent(panel, spriteId)!.enabled).toBe(false);
    expect(world.getComponent(label, textId)!.enabled).toBe(false);
  });

  it('stays hidden while hovered for less than showDelayMilliseconds', () => {
    const world = new EcsWorld();
    const { interactable, panel, label } = buildScene(world);

    interactable.isHovered = true;

    world.addSystem(createUiTooltipEcsSystem(buildTime(50)));
    world.update();

    expect(world.getComponent(panel, spriteId)!.enabled).toBe(false);
    expect(world.getComponent(label, textId)!.enabled).toBe(false);
  });

  it('shows once hovered continuously for at least showDelayMilliseconds', () => {
    const world = new EcsWorld();
    const { interactable, panel, label } = buildScene(world);

    interactable.isHovered = true;

    const system = createUiTooltipEcsSystem(buildTime(60));

    world.addSystem(system);
    world.update();
    world.update();

    expect(world.getComponent(panel, spriteId)!.enabled).toBe(true);
    expect(world.getComponent(label, textId)!.enabled).toBe(true);
  });

  it('shows while focused too (source-agnostic, matching the rest of the module)', () => {
    const world = new EcsWorld();
    const { interactable, panel, label } = buildScene(world);

    interactable.isFocused = true;

    const system = createUiTooltipEcsSystem(buildTime(150));

    world.addSystem(system);
    world.update();

    expect(world.getComponent(panel, spriteId)!.enabled).toBe(true);
    expect(world.getComponent(label, textId)!.enabled).toBe(true);
  });

  it('hides immediately once hover ends, resetting the elapsed timer', () => {
    const world = new EcsWorld();
    const { interactable, panel, label } = buildScene(world);

    interactable.isHovered = true;

    const system = createUiTooltipEcsSystem(buildTime(150));

    world.addSystem(system);
    world.update();

    expect(world.getComponent(panel, spriteId)!.enabled).toBe(true);

    interactable.isHovered = false;
    world.update();

    expect(world.getComponent(panel, spriteId)!.enabled).toBe(false);
    expect(world.getComponent(label, textId)!.enabled).toBe(false);
  });

  it('never shows while disabled (interactable: false)', () => {
    const world = new EcsWorld();
    const { interactable, panel, label } = buildScene(world);

    interactable.interactable = false;
    interactable.isHovered = true;

    const system = createUiTooltipEcsSystem(buildTime(500));

    world.addSystem(system);
    world.update();

    expect(world.getComponent(panel, spriteId)!.enabled).toBe(false);
    expect(world.getComponent(label, textId)!.enabled).toBe(false);
  });
});
