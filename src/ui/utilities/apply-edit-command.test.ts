import { describe, expect, it } from 'vitest';
import { applyEditCommand, UiInputState } from './apply-edit-command';

function state(
  value: string,
  caretIndex: number = value.length,
  selectionAnchor: number | null = null,
  maxLength?: number,
): UiInputState {
  return { value, caretIndex, selectionAnchor, maxLength };
}

describe('applyEditCommand', () => {
  describe('insert', () => {
    it('inserts text at caret', () => {
      const result = applyEditCommand(state('hello', 5), {
        type: 'insert',
        text: ' world',
      });
      expect(result.value).toBe('hello world');
      expect(result.caretIndex).toBe(11);
      expect(result.selectionAnchor).toBeNull();
    });

    it('inserts at middle of value', () => {
      const result = applyEditCommand(state('helo', 3), {
        type: 'insert',
        text: 'l',
      });
      expect(result.value).toBe('hello');
      expect(result.caretIndex).toBe(4);
    });

    it('replaces selection with inserted text', () => {
      const result = applyEditCommand(state('hello world', 5, 0), {
        type: 'insert',
        text: 'bye',
      });
      expect(result.value).toBe('bye world');
      expect(result.caretIndex).toBe(3);
      expect(result.selectionAnchor).toBeNull();
    });

    it('replaces reverse selection (caret before anchor)', () => {
      const result = applyEditCommand(state('hello', 2, 4), {
        type: 'insert',
        text: 'X',
      });
      expect(result.value).toBe('heXo');
      expect(result.caretIndex).toBe(3);
    });

    it('clears selection when inserting empty string (delete selection)', () => {
      const result = applyEditCommand(state('hello', 5, 0), {
        type: 'insert',
        text: '',
      });
      expect(result.value).toBe('');
      expect(result.caretIndex).toBe(0);
    });

    it('respects maxLength', () => {
      const result = applyEditCommand(state('abc', 3, null, 4), {
        type: 'insert',
        text: 'XY',
      });
      expect(result.value).toBe('abcX');
      expect(result.caretIndex).toBe(4);
    });

    it('does not insert when already at maxLength', () => {
      const result = applyEditCommand(state('abcd', 4, null, 4), {
        type: 'insert',
        text: 'X',
      });
      expect(result.value).toBe('abcd');
      expect(result.caretIndex).toBe(4);
    });
  });

  describe('backspace', () => {
    it('deletes char before caret', () => {
      const result = applyEditCommand(state('hello', 5), { type: 'backspace' });
      expect(result.value).toBe('hell');
      expect(result.caretIndex).toBe(4);
    });

    it('does nothing at start of value', () => {
      const result = applyEditCommand(state('hello', 0), { type: 'backspace' });
      expect(result.value).toBe('hello');
      expect(result.caretIndex).toBe(0);
    });

    it('deletes selection when selection is active', () => {
      const result = applyEditCommand(state('hello', 3, 1), {
        type: 'backspace',
      });
      expect(result.value).toBe('hlo');
      expect(result.caretIndex).toBe(1);
      expect(result.selectionAnchor).toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes char after caret', () => {
      const result = applyEditCommand(state('hello', 0), { type: 'delete' });
      expect(result.value).toBe('ello');
      expect(result.caretIndex).toBe(0);
    });

    it('does nothing at end of value', () => {
      const result = applyEditCommand(state('hello', 5), { type: 'delete' });
      expect(result.value).toBe('hello');
      expect(result.caretIndex).toBe(5);
    });

    it('deletes selection when selection is active', () => {
      const result = applyEditCommand(state('hello', 4, 2), { type: 'delete' });
      expect(result.value).toBe('heo');
      expect(result.caretIndex).toBe(2);
    });
  });

  describe('moveCaret', () => {
    it('moves caret left by 1', () => {
      const result = applyEditCommand(state('hello', 3), {
        type: 'moveCaret',
        delta: -1,
      });
      expect(result.caretIndex).toBe(2);
      expect(result.selectionAnchor).toBeNull();
    });

    it('moves caret right by 1', () => {
      const result = applyEditCommand(state('hello', 3), {
        type: 'moveCaret',
        delta: 1,
      });
      expect(result.caretIndex).toBe(4);
    });

    it('clamps caret to [0, length]', () => {
      expect(
        applyEditCommand(state('hi', 0), { type: 'moveCaret', delta: -5 })
          .caretIndex,
      ).toBe(0);
      expect(
        applyEditCommand(state('hi', 2), { type: 'moveCaret', delta: 5 })
          .caretIndex,
      ).toBe(2);
    });

    it('creates selection when select=true', () => {
      const result = applyEditCommand(state('hello', 3), {
        type: 'moveCaret',
        delta: 1,
        select: true,
      });
      expect(result.caretIndex).toBe(4);
      expect(result.selectionAnchor).toBe(3);
    });

    it('extends existing selection', () => {
      const result = applyEditCommand(state('hello', 4, 2), {
        type: 'moveCaret',
        delta: 1,
        select: true,
      });
      expect(result.caretIndex).toBe(5);
      expect(result.selectionAnchor).toBe(2); // anchor preserved
    });

    it('clears selection when select=false', () => {
      const result = applyEditCommand(state('hello', 4, 2), {
        type: 'moveCaret',
        delta: 0,
      });
      expect(result.selectionAnchor).toBeNull();
    });
  });

  describe('moveCaretWord', () => {
    it('jumps left over a word', () => {
      const result = applyEditCommand(state('hello world', 11), {
        type: 'moveCaretWord',
        direction: 'left',
      });
      expect(result.caretIndex).toBe(6); // start of "world"
    });

    it('jumps right over a word', () => {
      const result = applyEditCommand(state('hello world', 0), {
        type: 'moveCaretWord',
        direction: 'right',
      });
      expect(result.caretIndex).toBe(5); // end of "hello"
    });

    it('creates selection with select=true', () => {
      const result = applyEditCommand(state('hello world', 11), {
        type: 'moveCaretWord',
        direction: 'left',
        select: true,
      });
      expect(result.selectionAnchor).toBe(11);
      expect(result.caretIndex).toBe(6);
    });
  });

  describe('home', () => {
    it('moves caret to start', () => {
      const result = applyEditCommand(state('hello', 3), { type: 'home' });
      expect(result.caretIndex).toBe(0);
      expect(result.selectionAnchor).toBeNull();
    });

    it('selects from caret to start when select=true', () => {
      const result = applyEditCommand(state('hello', 3), {
        type: 'home',
        select: true,
      });
      expect(result.caretIndex).toBe(0);
      expect(result.selectionAnchor).toBe(3);
    });
  });

  describe('end', () => {
    it('moves caret to end', () => {
      const result = applyEditCommand(state('hello', 1), { type: 'end' });
      expect(result.caretIndex).toBe(5);
      expect(result.selectionAnchor).toBeNull();
    });

    it('selects from caret to end when select=true', () => {
      const result = applyEditCommand(state('hello', 2), {
        type: 'end',
        select: true,
      });
      expect(result.caretIndex).toBe(5);
      expect(result.selectionAnchor).toBe(2);
    });
  });

  describe('selectAll', () => {
    it('selects entire value', () => {
      const result = applyEditCommand(state('hello world', 3), {
        type: 'selectAll',
      });
      expect(result.caretIndex).toBe(11);
      expect(result.selectionAnchor).toBe(0);
    });

    it('handles empty value', () => {
      const result = applyEditCommand(state('', 0), { type: 'selectAll' });
      expect(result.caretIndex).toBe(0);
      expect(result.selectionAnchor).toBe(0);
    });
  });

  describe('setValue', () => {
    it('replaces entire value', () => {
      const result = applyEditCommand(state('hello', 3), {
        type: 'setValue',
        value: 'world',
      });
      expect(result.value).toBe('world');
      expect(result.caretIndex).toBe(5);
      expect(result.selectionAnchor).toBeNull();
    });

    it('uses provided caretIndex', () => {
      const result = applyEditCommand(state('hello', 0), {
        type: 'setValue',
        value: 'world',
        caretIndex: 2,
      });
      expect(result.caretIndex).toBe(2);
    });

    it('clamps caretIndex to new value length', () => {
      const result = applyEditCommand(state('hello world', 11), {
        type: 'setValue',
        value: 'hi',
        caretIndex: 100,
      });
      expect(result.caretIndex).toBe(2);
    });

    it('respects maxLength', () => {
      const result = applyEditCommand(state('', 0, null, 3), {
        type: 'setValue',
        value: 'hello',
      });
      expect(result.value).toBe('hel');
    });
  });

  describe('immutability', () => {
    it('does not mutate input state', () => {
      const original = state('hello', 3);
      const before = { ...original };
      applyEditCommand(original, { type: 'insert', text: 'X' });
      expect(original).toEqual(before);
    });
  });
});
