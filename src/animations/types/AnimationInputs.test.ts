import { beforeEach, describe, expect, it } from 'vitest';
import { AnimationInputs } from './AnimationInputs';

describe('AnimationInputs', () => {
  let animationInputs: AnimationInputs;

  beforeEach(() => {
    animationInputs = new AnimationInputs();
  });

  describe('registerToggle', () => {
    it('should register a new toggle input with default options', () => {
      animationInputs.registerToggle('toggle1');
      const toggle = animationInputs.getToggle('toggle1');
      expect(toggle.name).toBe('toggle1');
      expect(toggle.value).toBe(false);
      expect(toggle.options.resetOnFrameEnd).toBe(false);
    });

    it('should register a new toggle input with custom options', () => {
      animationInputs.registerToggle('toggle2', { resetOnFrameEnd: true });
      const toggle = animationInputs.getToggle('toggle2');
      expect(toggle.options.resetOnFrameEnd).toBe(true);
    });

    it('should throw an error if a toggle with the same name already exists', () => {
      animationInputs.registerToggle('toggle1');
      expect(() => animationInputs.registerToggle('toggle1')).toThrowError(
        'Input with name toggle1 already exists.',
      );
    });
  });

  describe('setToggle', () => {
    it('should set the value of a toggle input', () => {
      animationInputs.registerToggle('toggle1');
      animationInputs.setToggle('toggle1', true);
      const toggle = animationInputs.getToggle('toggle1');
      expect(toggle.value).toBe(true);
    });
  });

  describe('registerNumber', () => {
    it('should register a new number input with default options', () => {
      animationInputs.registerNumber('number1');
      const number = animationInputs.getNumber('number1');
      expect(number.name).toBe('number1');
      expect(number.value).toBe(0);
      expect(number.options.resetOnFrameEnd).toBe(false);
    });

    it('should register a new number input with custom options', () => {
      animationInputs.registerNumber('number2', { defaultValue: 42 });
      const number = animationInputs.getNumber('number2');
      expect(number.value).toBe(42);
    });

    it('should throw an error if a number input with the same name already exists', () => {
      animationInputs.registerNumber('number1');
      expect(() => animationInputs.registerNumber('number1')).toThrowError(
        'Input with name number1 already exists.',
      );
    });

    it('should not throw an error if a different type input with the same name already exists', () => {
      animationInputs.registerToggle('inputName');
      expect(() =>
        animationInputs.registerNumber('inputName'),
      ).not.toThrowError();
    });
  });

  describe('setNumber', () => {
    it('should set the value of a number input', () => {
      animationInputs.registerNumber('number1');
      animationInputs.setNumber('number1', 100);
      const number = animationInputs.getNumber('number1');
      expect(number.value).toBe(100);
    });
  });

  describe('registerText', () => {
    it('should register a new text input with default options', () => {
      animationInputs.registerText('text1');
      const text = animationInputs.getText('text1');
      expect(text.name).toBe('text1');
      expect(text.value).toBe('');
      expect(text.options.resetOnFrameEnd).toBe(false);
    });

    it('should register a new text input with custom options', () => {
      animationInputs.registerText('text2', { defaultValue: 'hello' });
      const text = animationInputs.getText('text2');
      expect(text.value).toBe('hello');
    });

    it('should throw an error if a text input with the same name already exists', () => {
      animationInputs.registerText('text1');
      expect(() => animationInputs.registerText('text1')).toThrowError(
        'Input with name text1 already exists.',
      );
    });
  });

  describe('setText', () => {
    it('should set the value of a text input', () => {
      animationInputs.registerText('text1');
      animationInputs.setText('text1', 'world');
      const text = animationInputs.getText('text1');
      expect(text.value).toBe('world');
    });
  });

  describe('getInputByName', () => {
    it('should return the correct input by name', () => {
      animationInputs.registerToggle('toggle1');
      animationInputs.registerNumber('number1');
      animationInputs.registerText('text1');

      const toggle = animationInputs.getInputByName('toggle1');
      const number = animationInputs.getInputByName('number1');
      const text = animationInputs.getInputByName('text1');

      expect(toggle.name).toBe('toggle1');
      expect(number.name).toBe('number1');
      expect(text.name).toBe('text1');
    });

    it('should throw an error if the input does not exist', () => {
      expect(() => animationInputs.getInputByName('nonexistent')).toThrowError(
        'Input with name nonexistent does not exist.',
      );
    });
  });

  describe('clearFrameEndInputs', () => {
    it('should reset inputs with resetOnFrameEnd set to true', () => {
      animationInputs.registerToggle('toggle1', { resetOnFrameEnd: true });
      animationInputs.registerNumber('number1', {
        resetOnFrameEnd: true,
        defaultValue: 10,
      });
      animationInputs.registerText('text1', {
        resetOnFrameEnd: true,
        defaultValue: 'default',
      });

      animationInputs.setToggle('toggle1', true);
      animationInputs.setNumber('number1', 42);
      animationInputs.setText('text1', 'changed');

      animationInputs.clearFrameEndInputs();

      expect(animationInputs.getToggle('toggle1').value).toBe(false);
      expect(animationInputs.getNumber('number1').value).toBe(10);
      expect(animationInputs.getText('text1').value).toBe('default');
    });

    it('should not reset inputs with resetOnFrameEnd set to false', () => {
      animationInputs.registerToggle('toggle1', { resetOnFrameEnd: false });
      animationInputs.setToggle('toggle1', true);

      animationInputs.clearFrameEndInputs();

      expect(animationInputs.getToggle('toggle1').value).toBe(true);
    });
  });
});
