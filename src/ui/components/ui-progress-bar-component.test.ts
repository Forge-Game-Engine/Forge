import { describe, expect, it } from 'vitest';
import {
  addUiProgressBarComponent,
  normalizeUiProgressBarValue,
  uiProgressBarId,
} from './ui-progress-bar-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addUiProgressBarComponent', () => {
  it('defaults minValue/maxValue/value', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const fill = world.createEntity();

    const component = addUiProgressBarComponent(world, entity, { fill });

    expect(component.fill).toBe(fill);
    expect(component.minValue).toBe(0);
    expect(component.maxValue).toBe(1);
    expect(component.value).toBe(0);
    expect(world.getComponent(entity, uiProgressBarId)).toBe(component);
  });

  it('defaults value to minValue when a custom range is given', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const fill = world.createEntity();

    const component = addUiProgressBarComponent(world, entity, {
      fill,
      minValue: 10,
      maxValue: 20,
    });

    expect(component.value).toBe(10);
  });

  it('clamps an out-of-range initial value', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const fill = world.createEntity();

    const component = addUiProgressBarComponent(world, entity, {
      fill,
      minValue: 0,
      maxValue: 10,
      value: -5,
    });

    expect(component.value).toBe(0);
  });
});

describe('normalizeUiProgressBarValue', () => {
  it('normalizes value to a 0-1 fraction of the range', () => {
    expect(
      normalizeUiProgressBarValue({ value: 25, minValue: 0, maxValue: 50 }),
    ).toBeCloseTo(0.5);
  });

  it('clamps an out-of-range value', () => {
    expect(
      normalizeUiProgressBarValue({ value: -5, minValue: 0, maxValue: 10 }),
    ).toBe(0);
    expect(
      normalizeUiProgressBarValue({ value: 15, minValue: 0, maxValue: 10 }),
    ).toBe(1);
  });

  it('returns 0 for a zero-length range', () => {
    expect(
      normalizeUiProgressBarValue({ value: 5, minValue: 5, maxValue: 5 }),
    ).toBe(0);
  });
});
