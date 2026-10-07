import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUiTextInputEcsSystem } from './ui-text-input-system.js';
import { addPositionComponent, Time } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addCameraComponent,
  Color,
  RenderContext,
  Texture,
  visibilityId,
} from '../../rendering/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import { textId, TextMeshEcsComponent, textMeshId } from '../../text/index.js';
import { addCanvasComponent } from '../components/canvas-component.js';
import {
  addRectTransformComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import {
  editTextInput,
  setTextInputValue,
  TextInputEcsComponent,
  textInputId,
} from '../components/text-input-component.js';
import { addUiInteractableComponent } from '../components/ui-interactable-component.js';
import { createTextInput, TextInput } from '../utilities/create-text-input.js';

const glyph = (codePoint: number) => ({
  codePoint,
  advance: 0.5,
  planeBounds: null,
  atlasBounds: null,
});

const fontAtlas = {
  data: {
    metrics: {
      lineHeight: 1.2,
      ascender: 0.8,
      descender: -0.2,
      capHeight: 0.7,
    },
    glyphs: new Map(
      [...'abcdefghijklmnopqrstuvwxyzAB'].map((character) => [
        character.codePointAt(0)!,
        glyph(character.codePointAt(0)!),
      ]),
    ),
  },
} as unknown as FontAtlas;

const buildSprite = () => ({
  width: 1,
  height: 1,
  texture: {} as Texture,
  pivot: { x: 0.5, y: 0.5 },
  tintColor: Color.white,
  uvOffset: { x: 0, y: 0 },
  uvScale: { x: 1, y: 1 },
  emissive: null,
  material: null,
  category: 1,
  layer: 0,
});

const pointer = (type: string, x: number, y: number): MouseEvent =>
  new MouseEvent(type, {
    clientX: x,
    clientY: y,
    button: 0,
    bubbles: true,
    cancelable: true,
  });

describe('createUiTextInputEcsSystem', () => {
  let container: HTMLDivElement;
  let renderContext: RenderContext;
  let world: EcsWorld;
  let field: TextInput;
  let textInput: TextInputEcsComponent;
  let canvasEntity: number;

  const type = (value: string): void => {
    textInput.entry.element.value = value;
    textInput.entry.element.setSelectionRange(value.length, value.length);
    textInput.entry.element.dispatchEvent(new Event('input'));
  };

  const keyDown = (code: string): void => {
    textInput.entry.element.dispatchEvent(
      new KeyboardEvent('keydown', { code, key: code, cancelable: true }),
    );
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const canvas = document.createElement('canvas');

    container.appendChild(canvas);

    renderContext = {
      canvas,
      width: 800,
      height: 600,
      cssWidth: 800,
      cssHeight: 600,
      pixelRatio: 1,
    } as unknown as RenderContext;

    world = new EcsWorld();

    const camera = world.createEntity();

    addPositionComponent(world, camera);
    addCameraComponent(world, camera, { verticalWorldUnits: 600 });

    canvasEntity = world.createEntity();
    addPositionComponent(world, canvasEntity);
    addRectTransformComponent(world, canvasEntity);
    addCanvasComponent(world, canvasEntity, { camera });

    field = createTextInput(world, canvasEntity, {
      renderContext,
      sprite: buildSprite(),
      fillSprite: buildSprite(),
      fontAtlas,
      size: 20,
      placeholder: 'Name',
    });
    textInput = field.textInput;

    // The field covers the world origin, i.e. the middle of the canvas.
    world.getComponent(field.entity, rectTransformId)!.rect = {
      min: { x: -100, y: -20 },
      max: { x: 100, y: 20 },
    };

    world.addSystem(
      createUiTextInputEcsSystem(renderContext, {
        rawDeltaTimeInMilliseconds: 16,
      } as Time),
    );
  });

  afterEach(() => {
    world.stop();
    container.remove();
  });

  it('mirrors typed text into value and raises onValueChanged', () => {
    const listener = vi.fn();

    field.onValueChanged.registerListener(listener);
    type('abc');
    world.update();

    expect(textInput.value).toBe('abc');
    expect(listener).toHaveBeenCalledWith('abc');
    expect(world.getComponent(field.textLabel, textId)!.text).toBe('abc');
  });

  it("drops characters the font can't draw, keeping spaces and the caret position", () => {
    type('a é b');
    textInput.entry.setSelection(3, 3);
    world.update();

    expect(textInput.value).toBe('a  b');
    expect(textInput.entry.value).toBe('a  b');
    expect(textInput.entry.selectionStart).toBe(2);
  });

  it('runs the font filter, then the game filter, then maxLength', () => {
    textInput.filter = (text) => text.toUpperCase();
    textInput.maxLength = 3;
    type('aé1bcd');
    world.update();

    expect(textInput.value).toBe('ABC');
  });

  it('does not filter or accept text during an IME composition', () => {
    const { element } = textInput.entry;

    element.dispatchEvent(new CompositionEvent('compositionstart'));
    element.dispatchEvent(
      new CompositionEvent('compositionupdate', { data: 'にa' }),
    );
    element.value = 'にa';
    world.update();

    expect(textInput.value).toBe('');
    expect(element.value).toBe('にa');
    expect(world.getComponent(field.textLabel, textId)!.text).toBe('にa');
    expect(
      world.getComponent(textInput.compositionUnderline, visibilityId)!.visible,
    ).toBe(true);

    element.dispatchEvent(new CompositionEvent('compositionend'));
    world.update();

    expect(textInput.value).toBe('a');
  });

  it('raises no change when every typed character is filtered out', () => {
    const listener = vi.fn();

    field.onValueChanged.registerListener(listener);
    type('é');
    world.update();

    expect(textInput.value).toBe('');
    expect(textInput.entry.value).toBe('');
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops editing a field that becomes non-interactable', () => {
    editTextInput(world, field.entity);
    world.update();

    field.interactable.interactable = false;
    world.update();

    expect(textInput.isEditing).toBe(false);
  });

  it('starts editing when the field is invoked', () => {
    field.interactable.wasInvokedThisFrame = true;
    world.update();

    expect(textInput.isEditing).toBe(true);
    expect(document.activeElement).toBe(textInput.entry.element);
  });

  it('starts editing through editTextInput', () => {
    editTextInput(world, field.entity);
    world.update();

    expect(textInput.isEditing).toBe(true);
  });

  it('does not start editing a field that is not interactable', () => {
    field.interactable.interactable = false;
    field.interactable.wasInvokedThisFrame = true;
    world.update();

    expect(textInput.isEditing).toBe(false);
  });

  it('submits on Enter with the value, ending editing', () => {
    const listener = vi.fn();

    field.onSubmit.registerListener(listener);
    editTextInput(world, field.entity);
    type('ab');
    keyDown('Enter');
    world.update();

    expect(listener).toHaveBeenCalledWith('ab');
    expect(textInput.isEditing).toBe(false);
  });

  it('cancels on Escape, keeping the value and ending editing', () => {
    const listener = vi.fn();

    field.onCancel.registerListener(listener);
    editTextInput(world, field.entity);
    type('ab');
    keyDown('Escape');
    world.update();

    expect(listener).toHaveBeenCalledOnce();
    expect(textInput.value).toBe('ab');
    expect(textInput.isEditing).toBe(false);
  });

  it('keeps editing when UI focus moves elsewhere, and stops when the input loses focus', () => {
    editTextInput(world, field.entity);
    world.update();

    field.interactable.isFocused = false;
    field.interactable.isHovered = false;
    world.update();

    expect(textInput.isEditing).toBe(true);

    textInput.entry.blur();
    world.update();

    expect(textInput.isEditing).toBe(false);
  });

  it('accepts a value set with setTextInputValue on the next tick, through the filters', () => {
    const listener = vi.fn();

    field.onValueChanged.registerListener(listener);
    setTextInputValue(world, field.entity, 'hé');
    world.update();

    expect(textInput.value).toBe('h');
    expect(listener).toHaveBeenCalledWith('h');
  });

  it('shows the placeholder only while the field is empty', () => {
    world.update();

    expect(
      world.getComponent(field.placeholderLabel, visibilityId)!.visible,
    ).toBe(true);

    type('a');
    world.update();

    expect(
      world.getComponent(field.placeholderLabel, visibilityId)!.visible,
    ).toBe(false);
  });

  it('places the caret and selection from the text mesh caret stops', () => {
    world.addComponent<TextMeshEcsComponent>(field.textLabel, textMeshId, {
      glyphs: [],
      bounds: { width: 30, height: 24 },
      caretStops: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 30, y: 0 },
      ],
    });
    editTextInput(world, field.entity);
    type('abc');
    textInput.entry.setSelection(2, 2);
    world.update();

    const caret = world.getComponent(textInput.caret, rectTransformId)!;

    expect(caret.anchoredPosition).toEqual({ x: 20, y: -4 });
    expect(world.getComponent(textInput.caret, visibilityId)!.visible).toBe(
      true,
    );
    expect(world.getComponent(textInput.selection, visibilityId)!.visible).toBe(
      false,
    );

    textInput.entry.setSelection(1, 3);
    world.update();

    const selection = world.getComponent(textInput.selection, rectTransformId)!;

    expect(selection.anchoredPosition.x).toBe(10);
    expect(selection.x.kind === 'point' && selection.x.size).toBe(20);
    expect(world.getComponent(textInput.selection, visibilityId)!.visible).toBe(
      true,
    );
    expect(world.getComponent(textInput.caret, visibilityId)!.visible).toBe(
      false,
    );
  });

  it('blinks the caret', () => {
    editTextInput(world, field.entity);
    world.update();

    const caretVisibility = world.getComponent(textInput.caret, visibilityId)!;

    expect(caretVisibility.visible).toBe(true);

    for (let i = 0; i < 40; i++) {
      world.update();
    }

    expect(caretVisibility.visible).toBe(false);
  });

  it('places the hidden input over the field in CSS pixels', () => {
    world.update();

    const { style } = textInput.entry.element;

    expect(style.left).toBe('300px');
    expect(style.top).toBe('280px');
    expect(style.width).toBe('200px');
    expect(style.height).toBe('40px');
  });

  it('does not move the hidden input for a field on a world-space canvas', () => {
    const worldCanvas = world.createEntity();

    addPositionComponent(world, worldCanvas);
    addRectTransformComponent(world, worldCanvas);
    addCanvasComponent(world, worldCanvas, {
      renderMode: 'worldSpace',
      camera: world.createEntity(),
    });

    const worldField = createTextInput(world, worldCanvas, {
      renderContext,
      sprite: buildSprite(),
      fillSprite: buildSprite(),
      fontAtlas,
      size: 20,
    });

    world.update();

    expect(worldField.textInput.entry.element.style.left).toBe('0px');
  });

  it("does not move the hidden input when the canvas's camera is missing", () => {
    const canvasWithoutCamera = world.createEntity();

    addPositionComponent(world, canvasWithoutCamera);
    addRectTransformComponent(world, canvasWithoutCamera);
    addCanvasComponent(world, canvasWithoutCamera, {
      camera: world.createEntity(),
    });

    const orphan = createTextInput(world, canvasWithoutCamera, {
      renderContext,
      sprite: buildSprite(),
      fillSprite: buildSprite(),
      fontAtlas,
      size: 20,
    });

    world.update();

    expect(orphan.textInput.entry.element.style.left).toBe('0px');
  });

  it('ignores presses that are not on a field, or not with the primary button', () => {
    world.update();

    const mouseDown = pointer('mousedown', 10, 10);

    container.dispatchEvent(mouseDown);
    expect(mouseDown.defaultPrevented).toBe(false);

    container.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 400, clientY: 300, button: 2 }),
    );
    container.dispatchEvent(
      new MouseEvent('pointerup', { clientX: 400, clientY: 300, button: 2 }),
    );

    expect(document.activeElement).not.toBe(textInput.entry.element);
  });

  it('focuses the field inside the tap that lands on it', () => {
    world.update();

    container.dispatchEvent(pointer('pointerdown', 400, 300));
    container.dispatchEvent(pointer('pointerup', 400, 300));

    expect(document.activeElement).toBe(textInput.entry.element);
  });

  it('does not let a press on the field take focus away from it', () => {
    world.update();

    const mouseDown = pointer('mousedown', 400, 300);

    container.dispatchEvent(mouseDown);

    expect(mouseDown.defaultPrevented).toBe(true);
  });

  it('does not focus the field for a drag that started elsewhere', () => {
    world.update();

    container.dispatchEvent(pointer('pointerdown', 10, 10));
    container.dispatchEvent(pointer('pointerup', 400, 300));

    expect(document.activeElement).not.toBe(textInput.entry.element);
  });

  it('does not focus a field covered by another element', () => {
    const cover = world.createEntity();

    addPositionComponent(world, cover);
    world.setParent(cover, canvasEntity);
    addRectTransformComponent(world, cover, {
      rect: { min: { x: -200, y: -200 }, max: { x: 200, y: 200 } },
    });
    addUiInteractableComponent(world, cover);
    world.update();

    container.dispatchEvent(pointer('pointerdown', 400, 300));
    container.dispatchEvent(pointer('pointerup', 400, 300));

    expect(document.activeElement).not.toBe(textInput.entry.element);
  });

  it("removes a field's hidden input with its component, and every input on cleanup", () => {
    const other = createTextInput(world, canvasEntity, {
      renderContext,
      sprite: buildSprite(),
      fillSprite: buildSprite(),
      fontAtlas,
      size: 20,
    });

    world.update();

    const { element } = textInput.entry;

    world.removeComponent(field.entity, textInputId);
    world.update();

    expect(element.isConnected).toBe(false);
    expect(other.textInput.entry.element.isConnected).toBe(true);

    world.stop();

    expect(other.textInput.entry.element.isConnected).toBe(false);
  });
});
