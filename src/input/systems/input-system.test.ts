import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputSystem } from './input-system';
import { Entity } from '../../ecs';
import { PositionComponent } from '../../common';
import { CameraComponent } from '../../rendering';
import { InputsComponent } from '../components';
import { Vector2 } from '../../math';

describe('InputSystem', () => {
  let gameContainer: HTMLElement;
  let cameraEntity: Entity;
  let inputSystem: InputSystem;

  beforeEach(() => {
    gameContainer = document.createElement('div');
    cameraEntity = new Entity('camera', [
      new PositionComponent(0, 0),
      new CameraComponent(),
    ]);

    inputSystem = new InputSystem(gameContainer, cameraEntity, 1000, 1000);
  });

  it('should initialize with default values', () => {
    expect(inputSystem).toBeDefined();
  });

  it('should handle key down events', () => {
    const event = new KeyboardEvent('keydown', { code: 'KeyA' });
    document.dispatchEvent(event);

    expect(inputSystem['_keyPresses'].has('KeyA')).toBe(true);
    expect(inputSystem['_keyDowns'].has('KeyA')).toBe(true);
  });

  it('should handle key up events', () => {
    const downEvent = new KeyboardEvent('keydown', { code: 'KeyA' });
    const upEvent = new KeyboardEvent('keyup', { code: 'KeyA' });

    document.dispatchEvent(downEvent);
    document.dispatchEvent(upEvent);

    expect(inputSystem['_keyPresses'].has('KeyA')).toBe(false);
    expect(inputSystem['_keyUps'].has('KeyA')).toBe(true);
  });

  it('should handle mouse down events', () => {
    const event = new MouseEvent('mousedown', { button: 0 });
    window.dispatchEvent(event);

    expect(inputSystem['_mouseButtonPresses'].has(0)).toBe(true);
    expect(inputSystem['_mouseButtonDowns'].has(0)).toBe(true);
  });

  it('should handle mouse up events', () => {
    const downEvent = new MouseEvent('mousedown', { button: 0 });
    const upEvent = new MouseEvent('mouseup', { button: 0 });

    window.dispatchEvent(downEvent);
    window.dispatchEvent(upEvent);

    expect(inputSystem['_mouseButtonPresses'].has(0)).toBe(false);
    expect(inputSystem['_mouseButtonUps'].has(0)).toBe(true);
  });

  it('should handle mouse move events', async () => {
    const inputsComponent = new InputsComponent();
    const entity = new Entity('inputs', [inputsComponent]);

    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 500,
      clientY: 500,
    });
    window.dispatchEvent(mouseMoveEvent);

    await inputSystem.run(entity);

    expect(inputsComponent.localMouseCoordinates).toEqual(
      new Vector2(500, 500),
    );
    expect(inputsComponent.worldMouseCoordinates).toEqual(new Vector2(0, 0));
  });

  it('should handle scroll events', () => {
    const event = new WheelEvent('wheel', { deltaY: 100 });
    gameContainer.dispatchEvent(event);

    expect(inputSystem['_scrollDelta']).toBe(100);
  });

  it('should clear inputs after run', async () => {
    const inputsComponent = new InputsComponent();

    const entity = new Entity('inputs', [inputsComponent]);

    const keyDownEvent = new KeyboardEvent('keydown', { code: 'KeyA' });
    document.dispatchEvent(keyDownEvent);

    await inputSystem.run(entity);

    expect(inputsComponent.keyPresses.has('KeyA')).toBe(true);
    expect(inputsComponent.keyDowns.has('KeyA')).toBe(true);

    await inputSystem.run(entity);

    expect(inputsComponent.keyPresses.has('KeyA')).toBe(true);
    expect(inputsComponent.keyDowns.has('KeyA')).toBe(false);

    const keyUpEvent = new KeyboardEvent('keyup', { code: 'KeyA' });
    document.dispatchEvent(keyUpEvent);

    await inputSystem.run(entity);

    expect(inputsComponent.keyUps.has('KeyA')).toBe(true);
    expect(inputsComponent.keyPresses.has('KeyA')).toBe(false);
  });

  it('should remove event listeners on stop', () => {
    const removeEventListenerSpy = vi.spyOn(
      gameContainer,
      'removeEventListener',
    );
    inputSystem.stop();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
