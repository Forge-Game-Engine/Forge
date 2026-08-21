import { describe, expect, it } from 'vitest';
import { createUiToggleEcsSystem } from './ui-toggle-system.js';
import { EcsWorld } from '../../ecs/index.js';
import { addUiInteractableComponent } from '../components/ui-interactable-component.js';
import { addUiToggleComponent } from '../components/ui-toggle-component.js';
import { addUiToggleGroupComponent } from '../components/ui-toggle-group-component.js';

describe('createUiToggleEcsSystem', () => {
  it('does nothing when the interactable was not invoked this tick', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addUiInteractableComponent(world, entity);
    const toggle = addUiToggleComponent(world, entity);

    world.addSystem(createUiToggleEcsSystem());
    world.update();

    expect(toggle.isOn).toBe(false);
  });

  it('flips isOn on invocation for an independent (ungrouped) toggle', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const interactable = addUiInteractableComponent(world, entity);
    const toggle = addUiToggleComponent(world, entity);

    world.addSystem(createUiToggleEcsSystem());

    interactable.wasInvokedThisFrame = true;
    world.update();

    expect(toggle.isOn).toBe(true);

    interactable.wasInvokedThisFrame = true;
    world.update();

    expect(toggle.isOn).toBe(false);
  });

  it('raises onValueChanged with the new value', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const interactable = addUiInteractableComponent(world, entity);
    const toggle = addUiToggleComponent(world, entity);
    const values: boolean[] = [];
    toggle.onValueChanged.registerListener((value) => values.push(value));

    world.addSystem(createUiToggleEcsSystem());

    interactable.wasInvokedThisFrame = true;
    world.update();

    expect(values).toEqual([true]);
  });

  it('turns off every other toggle in the same group when one turns on', () => {
    const world = new EcsWorld();
    const group = world.createEntity();
    addUiToggleGroupComponent(world, group);

    const entityA = world.createEntity();
    const interactableA = addUiInteractableComponent(world, entityA);
    const toggleA = addUiToggleComponent(world, entityA, {
      isOn: true,
      group,
    });

    const entityB = world.createEntity();
    const interactableB = addUiInteractableComponent(world, entityB);
    const toggleB = addUiToggleComponent(world, entityB, { group });

    world.addSystem(createUiToggleEcsSystem());

    interactableB.wasInvokedThisFrame = true;
    world.update();

    expect(toggleB.isOn).toBe(true);
    expect(toggleA.isOn).toBe(false);
    expect(interactableA.wasInvokedThisFrame).toBe(false);
  });

  it('ignores invoking the already-on toggle in a radio group (allowSwitchOff: false)', () => {
    const world = new EcsWorld();
    const group = world.createEntity();
    addUiToggleGroupComponent(world, group);

    const entity = world.createEntity();
    const interactable = addUiInteractableComponent(world, entity);
    const toggle = addUiToggleComponent(world, entity, { isOn: true, group });

    world.addSystem(createUiToggleEcsSystem());

    interactable.wasInvokedThisFrame = true;
    world.update();

    expect(toggle.isOn).toBe(true);
  });

  it('leaves an already-off toggle in the group untouched (no spurious onValueChanged)', () => {
    const world = new EcsWorld();
    const group = world.createEntity();
    addUiToggleGroupComponent(world, group);

    const entityA = world.createEntity();
    addUiInteractableComponent(world, entityA);
    const toggleA = addUiToggleComponent(world, entityA, { isOn: true, group });

    const entityB = world.createEntity();
    const interactableB = addUiInteractableComponent(world, entityB);
    const toggleB = addUiToggleComponent(world, entityB, { group });

    const entityC = world.createEntity();
    addUiInteractableComponent(world, entityC);
    const toggleC = addUiToggleComponent(world, entityC, { group });
    const cValues: boolean[] = [];
    toggleC.onValueChanged.registerListener((value) => cValues.push(value));

    world.addSystem(createUiToggleEcsSystem());

    interactableB.wasInvokedThisFrame = true;
    world.update();

    expect(toggleB.isOn).toBe(true);
    expect(toggleA.isOn).toBe(false);
    expect(toggleC.isOn).toBe(false);
    expect(cValues).toEqual([]);
  });

  it('allows switching the already-on toggle off when allowSwitchOff is true', () => {
    const world = new EcsWorld();
    const group = world.createEntity();
    addUiToggleGroupComponent(world, group, { allowSwitchOff: true });

    const entity = world.createEntity();
    const interactable = addUiInteractableComponent(world, entity);
    const toggle = addUiToggleComponent(world, entity, { isOn: true, group });

    world.addSystem(createUiToggleEcsSystem());

    interactable.wasInvokedThisFrame = true;
    world.update();

    expect(toggle.isOn).toBe(false);
  });
});
