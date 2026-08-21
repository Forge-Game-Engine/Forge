import { describe, expect, it } from 'vitest';
import {
  addUiSliderComponent,
  denormalizeUiSliderValue,
  normalizeUiSliderValue,
  uiSliderId,
} from './ui-slider-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addUiSliderComponent', () => {
  it('defaults minValue/maxValue/value/wholeNumbers', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const handle = world.createEntity();

    const component = addUiSliderComponent(world, entity, { handle });

    expect(component.handle).toBe(handle);
    expect(component.minValue).toBe(0);
    expect(component.maxValue).toBe(1);
    expect(component.value).toBe(0);
    expect(component.wholeNumbers).toBe(false);
    expect(component.fill).toBeUndefined();
    expect(world.getComponent(entity, uiSliderId)).toBe(component);
  });

  it('defaults value to minValue when a custom range is given', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const handle = world.createEntity();

    const component = addUiSliderComponent(world, entity, {
      handle,
      minValue: 10,
      maxValue: 20,
    });

    expect(component.value).toBe(10);
  });

  it('clamps an out-of-range initial value', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const handle = world.createEntity();

    const component = addUiSliderComponent(world, entity, {
      handle,
      minValue: 0,
      maxValue: 10,
      value: 999,
    });

    expect(component.value).toBe(10);
  });

  it('raises onValueChanged with the new value', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const handle = world.createEntity();

    const component = addUiSliderComponent(world, entity, { handle });
    const values: number[] = [];
    component.onValueChanged.registerListener((value) => values.push(value));

    component.onValueChanged.raise(0.5);

    expect(values).toEqual([0.5]);
  });
});

describe('normalizeUiSliderValue', () => {
  it('normalizes value to a 0-1 fraction of the range', () => {
    expect(
      normalizeUiSliderValue({ value: 5, minValue: 0, maxValue: 10 }),
    ).toBeCloseTo(0.5);
    expect(
      normalizeUiSliderValue({ value: 0, minValue: 0, maxValue: 10 }),
    ).toBe(0);
    expect(
      normalizeUiSliderValue({ value: 10, minValue: 0, maxValue: 10 }),
    ).toBe(1);
  });

  it('clamps an out-of-range value', () => {
    expect(
      normalizeUiSliderValue({ value: -5, minValue: 0, maxValue: 10 }),
    ).toBe(0);
    expect(
      normalizeUiSliderValue({ value: 15, minValue: 0, maxValue: 10 }),
    ).toBe(1);
  });

  it('returns 0 for a zero-length range', () => {
    expect(normalizeUiSliderValue({ value: 5, minValue: 5, maxValue: 5 })).toBe(
      0,
    );
  });
});

describe('denormalizeUiSliderValue', () => {
  it('maps a 0-1 fraction back into the value range', () => {
    expect(
      denormalizeUiSliderValue(
        { minValue: 0, maxValue: 10, wholeNumbers: false },
        0.5,
      ),
    ).toBeCloseTo(5);
  });

  it('clamps t before mapping', () => {
    expect(
      denormalizeUiSliderValue(
        { minValue: 0, maxValue: 10, wholeNumbers: false },
        1.5,
      ),
    ).toBe(10);
    expect(
      denormalizeUiSliderValue(
        { minValue: 0, maxValue: 10, wholeNumbers: false },
        -0.5,
      ),
    ).toBe(0);
  });

  it('rounds to the nearest whole number when wholeNumbers is set', () => {
    expect(
      denormalizeUiSliderValue(
        { minValue: 0, maxValue: 10, wholeNumbers: true },
        0.44,
      ),
    ).toBe(4);
    expect(
      denormalizeUiSliderValue(
        { minValue: 0, maxValue: 10, wholeNumbers: true },
        0.46,
      ),
    ).toBe(5);
  });
});
