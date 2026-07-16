import { describe, expect, it } from 'vitest';
import {
  addToneMappingComponent,
  toneMappingId,
} from './tone-mapping-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { TONE_MAPPING_OPERATOR } from '../enums/index.js';

describe('addToneMappingComponent', () => {
  it('attaches a component with default exposure and operator', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    addToneMappingComponent(world, cameraEntity);

    expect(world.getComponent(cameraEntity, toneMappingId)).toEqual({
      exposure: 1,
      operator: TONE_MAPPING_OPERATOR.aces,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    addToneMappingComponent(world, cameraEntity, { exposure: 2 });

    expect(world.getComponent(cameraEntity, toneMappingId)).toEqual({
      exposure: 2,
      operator: TONE_MAPPING_OPERATOR.aces,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const cameraEntity = world.createEntity();

    const component = addToneMappingComponent(world, cameraEntity, {
      exposure: 1.5,
      operator: TONE_MAPPING_OPERATOR.reinhard,
    });

    expect(component).toEqual({
      exposure: 1.5,
      operator: TONE_MAPPING_OPERATOR.reinhard,
    });
    expect(world.getComponent(cameraEntity, toneMappingId)).toBe(component);
  });
});
