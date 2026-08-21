import { describe, expect, it } from 'vitest';
import {
  addUiColorTransitionComponent,
  uiColorTransitionId,
} from './ui-color-transition-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { linear } from '../../animations/easing-functions/index.js';
import { Color } from '../../rendering/index.js';
import { uiInteractionVisualStates } from '../types/ui-interaction-visual-state.js';

describe('addUiColorTransitionComponent', () => {
  it('attaches a component with default values for unspecified options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addUiColorTransitionComponent(world, entity);

    expect(component.normalColor).toBe(Color.white);
    expect(component.hoverColor).toBe(Color.white);
    expect(component.pressedColor).toBe(Color.white);
    expect(component.disabledColor).toBe(Color.white);
    expect(component.duration).toBe(100);
    expect(component.easing).toBe(linear);
    expect(component.targetState).toBe(uiInteractionVisualStates.normal);
    expect(component.fromColor).toBe(Color.white);
    expect(component.elapsedMilliseconds).toBe(100);

    expect(world.getComponent(entity, uiColorTransitionId)).toBe(component);
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const hoverColor = new Color(0.8, 0.8, 0.8, 1);

    const component = addUiColorTransitionComponent(world, entity, {
      hoverColor,
      duration: 250,
    });

    expect(component.hoverColor).toBe(hoverColor);
    expect(component.duration).toBe(250);
    expect(component.normalColor).toBe(Color.white);
    expect(component.fromColor).toBe(Color.white);
  });
});
