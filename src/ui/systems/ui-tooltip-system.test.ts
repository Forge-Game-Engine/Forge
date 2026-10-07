import { describe, expect, it } from 'vitest';
import { createUiTooltipEcsSystem } from './ui-tooltip-system.js';
import { Time } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { addVisibilityComponent, visibilityId } from '../../rendering/index.js';
import { addTooltipComponent } from '../components/tooltip-component.js';
import { addUiInteractableComponent } from '../components/ui-interactable-component.js';

const buildTime = (deltaTimeInMilliseconds: number): Time =>
  ({ deltaTimeInMilliseconds }) as Time;

function buildScene(world: EcsWorld) {
  const source = world.createEntity();
  const interactable = addUiInteractableComponent(world, source);

  const panel = world.createEntity();

  addVisibilityComponent(world, panel, { visible: false });
  addTooltipComponent(world, source, {
    panel,
    showDelayMilliseconds: 100,
  });

  return { source, interactable, panel };
}

describe('createUiTooltipEcsSystem', () => {
  it('starts hidden', () => {
    const world = new EcsWorld();
    const { panel } = buildScene(world);

    world.addSystem(createUiTooltipEcsSystem(buildTime(16)));
    world.update();

    expect(world.getComponent(panel, visibilityId)!.visible).toBe(false);
  });

  it('stays hidden while hovered for less than showDelayMilliseconds', () => {
    const world = new EcsWorld();
    const { interactable, panel } = buildScene(world);

    interactable.isHovered = true;

    world.addSystem(createUiTooltipEcsSystem(buildTime(50)));
    world.update();

    expect(world.getComponent(panel, visibilityId)!.visible).toBe(false);
  });

  it('shows once hovered continuously for at least showDelayMilliseconds', () => {
    const world = new EcsWorld();
    const { interactable, panel } = buildScene(world);

    interactable.isHovered = true;

    const system = createUiTooltipEcsSystem(buildTime(60));

    world.addSystem(system);
    world.update();
    world.update();

    expect(world.getComponent(panel, visibilityId)!.visible).toBe(true);
  });

  it('shows while focused too (source-agnostic, matching the rest of the module)', () => {
    const world = new EcsWorld();
    const { interactable, panel } = buildScene(world);

    interactable.isFocused = true;

    const system = createUiTooltipEcsSystem(buildTime(150));

    world.addSystem(system);
    world.update();

    expect(world.getComponent(panel, visibilityId)!.visible).toBe(true);
  });

  it('hides immediately once hover ends, resetting the elapsed timer', () => {
    const world = new EcsWorld();
    const { interactable, panel } = buildScene(world);

    interactable.isHovered = true;

    const system = createUiTooltipEcsSystem(buildTime(150));

    world.addSystem(system);
    world.update();

    expect(world.getComponent(panel, visibilityId)!.visible).toBe(true);

    interactable.isHovered = false;
    world.update();

    expect(world.getComponent(panel, visibilityId)!.visible).toBe(false);
  });

  it('never shows while disabled (interactable: false)', () => {
    const world = new EcsWorld();
    const { interactable, panel } = buildScene(world);

    interactable.interactable = false;
    interactable.isHovered = true;

    const system = createUiTooltipEcsSystem(buildTime(500));

    world.addSystem(system);
    world.update();

    expect(world.getComponent(panel, visibilityId)!.visible).toBe(false);
  });

  it('throws when the panel has no VisibilityEcsComponent', () => {
    const world = new EcsWorld();
    const source = world.createEntity();

    addUiInteractableComponent(world, source);
    addTooltipComponent(world, source, { panel: world.createEntity() });
    world.addSystem(createUiTooltipEcsSystem(buildTime(16)));

    expect(() => world.update()).toThrow(/visibility/);
  });
});
