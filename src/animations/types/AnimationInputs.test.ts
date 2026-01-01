import { beforeEach, describe, expect, it } from 'vitest';
import { AnimationInputs } from './AnimationInputs';

describe('AnimationInputs', () => {
  // TODO: add tests for trigger inputs and add tests for default values when registering inputs

  let animationInputs: AnimationInputs;

  beforeEach(() => {
    animationInputs = new AnimationInputs();
  });

  describe('Toggle functions', () => {
    it('should register a new toggle input with default options', () => {
      animationInputs.registerToggle('toggle1');
      const toggle = animationInputs.getToggle('toggle1');
      expect(toggle?.name).toBe('toggle1');
      expect(toggle?.value).toBe(false);
    });

    it('should throw an error if a toggle with the same name already exists', () => {
      animationInputs.registerToggle('toggle1');
      expect(() => animationInputs.registerToggle('toggle1')).toThrowError(
        'Input with name toggle1 already exists.',
      );
    });

    it('should set the value of a toggle input', () => {
      animationInputs.registerToggle('toggle1');
      animationInputs.setToggle('toggle1', true);
      const toggle = animationInputs.getToggle('toggle1');
      expect(toggle?.value).toBe(true);
    });
  });

  describe('Number functions', () => {
    it('should register a new number input with default options', () => {
      animationInputs.registerNumber('number1');
      const number = animationInputs.getNumber('number1');
      expect(number?.name).toBe('number1');
      expect(number?.value).toBe(0);
    });

    it('should register a new number input with custom options', () => {
      animationInputs.registerNumber('number2', 42);
      const number = animationInputs.getNumber('number2');
      expect(number?.value).toBe(42);
    });

    it('should throw an error if a number input with the same name already exists', () => {
      animationInputs.registerNumber('number1');
      expect(() => animationInputs.registerNumber('number1')).toThrowError(
        'Input with name number1 already exists.',
      );
    });

    it('should not throw an error if a different type input with the same name already exists', () => {
      animationInputs.registerToggle('inputName');
      animationInputs.registerText('inputName');
      expect(() =>
        animationInputs.registerNumber('inputName'),
      ).not.toThrowError();
    });

    it('should set the value of a number input', () => {
      animationInputs.registerNumber('number1');
      animationInputs.setNumber('number1', 100);
      const number = animationInputs.getNumber('number1');
      expect(number?.value).toBe(100);
    });
  });

  describe('Text functions', () => {
    it('should register a new text input with default options', () => {
      animationInputs.registerText('text1');

      const text = animationInputs.getText('text1');

      expect(text?.name).toBe('text1');
      expect(text?.value).toBe('');
    });

    it('should register a new text input with custom options', () => {
      animationInputs.registerText('text2', 'hello');
      const text = animationInputs.getText('text2');
      expect(text?.value).toBe('hello');
    });

    it('should throw an error if a text input with the same name already exists', () => {
      animationInputs.registerText('text1');
      expect(() => animationInputs.registerText('text1')).toThrowError(
        'Input with name text1 already exists.',
      );
    });
    it('should set the value of a text input', () => {
      animationInputs.registerText('text1');
      animationInputs.setText('text1', 'world');
      const text = animationInputs.getText('text1');
      expect(text?.value).toBe('world');
    });
  });

  describe('General functions', () => {
    it('should return the correct input by name', () => {
      animationInputs.registerToggle('toggle1');
      animationInputs.registerNumber('number1');
      animationInputs.registerText('text1');
      animationInputs.registerTrigger('trigger1');

      const toggle = animationInputs.getToggle('toggle1');
      const number = animationInputs.getNumber('number1');
      const text = animationInputs.getText('text1');
      const trigger = animationInputs.getTrigger('trigger1');

      expect(toggle?.name).toBe('toggle1');
      expect(number?.name).toBe('number1');
      expect(text?.name).toBe('text1');
      expect(trigger?.name).toBe('trigger1');
    });

    it('should return null if the input does not exist', () => {
      const textInput = animationInputs.getText('nonexistent');
      const numberInput = animationInputs.getNumber('nonexistent');
      const toggleInput = animationInputs.getToggle('nonexistent');
      const triggerInput = animationInputs.getTrigger('nonexistent');

      expect(textInput).toBeNull();
      expect(numberInput).toBeNull();
      expect(toggleInput).toBeNull();
      expect(triggerInput).toBeNull();
    });

    it('should throw an error when setting a non-existent input', () => {
      expect(() => animationInputs.setToggle('nonexistent', true)).toThrowError(
        'Input with name nonexistent does not exist.',
      );
      expect(() => animationInputs.setNumber('nonexistent', 10)).toThrowError(
        'Input with name nonexistent does not exist.',
      );
      expect(() =>
        animationInputs.setText('nonexistent', 'value'),
      ).toThrowError('Input with name nonexistent does not exist.');
      expect(() => animationInputs.setTrigger('nonexistent')).toThrowError(
        'Input with name nonexistent does not exist.',
      );
    });

    it('should set triggers to false on update', () => {
      animationInputs.registerTrigger('trigger1');
      animationInputs.setTrigger('trigger1');

      let trigger = animationInputs.getTrigger('trigger1')!;
      expect(trigger.value).toBe(true);

      animationInputs.update();
      trigger = animationInputs.getTrigger('trigger1')!;
      expect(trigger.value).toBe(false);
    });
  });
});
