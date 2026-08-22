import { describe, expect, it } from 'vitest';
import {
  addContentSizeFitterComponent,
  contentSizeFitterId,
} from './content-size-fitter-component.js';
import { EcsWorld } from '../../ecs/index.js';

describe('addContentSizeFitterComponent', () => {
  it('defaults both fit modes to unconstrained', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addContentSizeFitterComponent(world, entity);

    expect(component.horizontalFit).toBe('unconstrained');
    expect(component.verticalFit).toBe('unconstrained');
    expect(world.getComponent(entity, contentSizeFitterId)).toBe(component);
  });

  it('accepts overrides', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addContentSizeFitterComponent(world, entity, {
      horizontalFit: 'preferredSize',
      verticalFit: 'minSize',
    });

    expect(component.horizontalFit).toBe('preferredSize');
    expect(component.verticalFit).toBe('minSize');
  });
});
