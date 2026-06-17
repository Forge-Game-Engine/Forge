/**
 * The minimal state managed by an input box, consumed by {@link applyEditCommand}.
 *
 * All fields are plain values so the reducer can run without any DOM or GL
 * dependency — it is fully unit-testable in isolation.
 */
export interface UiInputState {
  /** Current field value. */
  value: string;

  /** Index in `value` where the caret sits (insertion point). Range `[0, value.length]`. */
  caretIndex: number;

  /**
   * Anchor of a text selection, or `null` when there is no selection.
   * The selection spans `[min(caretIndex, selectionAnchor), max(caretIndex, selectionAnchor)]`.
   * `caretIndex` is the active (moveable) end; `selectionAnchor` is the fixed end.
   */
  selectionAnchor: number | null;

  /**
   * Maximum allowed number of characters. `undefined` means no limit.
   * Enforced by insert and setValue commands.
   */
  maxLength?: number;
}

/**
 * Discriminated union of all edit operations understood by {@link applyEditCommand}.
 *
 * Key design choices:
 * - `insert` covers both single characters and paste (multi-char).
 * - Arrow-key caret movement is `moveCaret` with `delta = ±1`.
 * - Word jumps are a separate command so callers don't need to compute
 *   word boundaries.
 * - `setValue` is used to programmatically set the full value (e.g. from an
 *   external data binding or after IME composition).
 */
export type EditCommand =
  | { type: 'insert'; text: string }
  | { type: 'backspace' }
  | { type: 'delete' }
  | { type: 'moveCaret'; delta: number; select?: boolean }
  | { type: 'moveCaretWord'; direction: 'left' | 'right'; select?: boolean }
  | { type: 'home'; select?: boolean }
  | { type: 'end'; select?: boolean }
  | { type: 'selectAll' }
  | { type: 'setValue'; value: string; caretIndex?: number };

/** Returns `[start, end]` of the current selection (start ≤ end). */
function selectionRange(state: UiInputState): [number, number] {
  const anchor = state.selectionAnchor ?? state.caretIndex;

  return [
    Math.min(state.caretIndex, anchor),
    Math.max(state.caretIndex, anchor),
  ];
}

/** Returns `true` when there is an active text selection. */
function hasSelection(state: UiInputState): boolean {
  return (
    state.selectionAnchor !== null && state.selectionAnchor !== state.caretIndex
  );
}

/**
 * Finds the index of the nearest word boundary to the left of `index`.
 * A word boundary is a transition between a word character (`\w`) and a
 * non-word character.
 */
function wordBoundaryLeft(value: string, index: number): number {
  let i = index;

  // Skip trailing non-word chars
  while (i > 0 && !/\w/.test(value[i - 1])) {
    i--;
  }

  // Skip the word itself
  while (i > 0 && /\w/.test(value[i - 1])) {
    i--;
  }

  return i;
}

/**
 * Finds the index of the nearest word boundary to the right of `index`.
 */
function wordBoundaryRight(value: string, index: number): number {
  let i = index;

  // Skip leading non-word chars
  while (i < value.length && !/\w/.test(value[i])) {
    i++;
  }

  // Skip the word itself
  while (i < value.length && /\w/.test(value[i])) {
    i++;
  }

  return i;
}

function applyInsert(state: UiInputState, text: string): UiInputState {
  const [start, end] = selectionRange(state);
  const before = state.value.slice(0, start);
  const after = state.value.slice(end);
  let inserted = text;

  if (state.maxLength !== undefined) {
    const available = state.maxLength - before.length - after.length;

    if (available <= 0) {
      return { ...state, selectionAnchor: null };
    }

    inserted = inserted.slice(0, available);
  }

  return {
    ...state,
    value: before + inserted + after,
    caretIndex: start + inserted.length,
    selectionAnchor: null,
  };
}

function applyBackspace(state: UiInputState): UiInputState {
  if (hasSelection(state)) {
    return applyInsert(state, '');
  }

  if (state.caretIndex === 0) {
    return state;
  }

  return {
    ...state,
    value:
      state.value.slice(0, state.caretIndex - 1) +
      state.value.slice(state.caretIndex),
    caretIndex: state.caretIndex - 1,
    selectionAnchor: null,
  };
}

function applyDelete(state: UiInputState): UiInputState {
  if (hasSelection(state)) {
    return applyInsert(state, '');
  }

  if (state.caretIndex >= state.value.length) {
    return state;
  }

  return {
    ...state,
    value:
      state.value.slice(0, state.caretIndex) +
      state.value.slice(state.caretIndex + 1),
    selectionAnchor: null,
  };
}

function applyMoveCaret(
  state: UiInputState,
  cmd: Extract<EditCommand, { type: 'moveCaret' }>,
): UiInputState {
  const anchor = cmd.select
    ? (state.selectionAnchor ?? state.caretIndex)
    : null;
  const newCaret = Math.max(
    0,
    Math.min(state.value.length, state.caretIndex + cmd.delta),
  );

  return { ...state, caretIndex: newCaret, selectionAnchor: anchor };
}

function applyMoveCaretWord(
  state: UiInputState,
  cmd: Extract<EditCommand, { type: 'moveCaretWord' }>,
): UiInputState {
  const anchor = cmd.select
    ? (state.selectionAnchor ?? state.caretIndex)
    : null;
  const newCaret =
    cmd.direction === 'left'
      ? wordBoundaryLeft(state.value, state.caretIndex)
      : wordBoundaryRight(state.value, state.caretIndex);

  return { ...state, caretIndex: newCaret, selectionAnchor: anchor };
}

function applyHome(
  state: UiInputState,
  cmd: Extract<EditCommand, { type: 'home' }>,
): UiInputState {
  const anchor = cmd.select
    ? (state.selectionAnchor ?? state.caretIndex)
    : null;

  return { ...state, caretIndex: 0, selectionAnchor: anchor };
}

function applyEnd(
  state: UiInputState,
  cmd: Extract<EditCommand, { type: 'end' }>,
): UiInputState {
  const anchor = cmd.select
    ? (state.selectionAnchor ?? state.caretIndex)
    : null;

  return { ...state, caretIndex: state.value.length, selectionAnchor: anchor };
}

function applySetValue(
  state: UiInputState,
  cmd: Extract<EditCommand, { type: 'setValue' }>,
): UiInputState {
  const clamped =
    state.maxLength !== undefined
      ? cmd.value.slice(0, state.maxLength)
      : cmd.value;

  return {
    ...state,
    value: clamped,
    caretIndex: Math.min(cmd.caretIndex ?? clamped.length, clamped.length),
    selectionAnchor: null,
  };
}

/**
 * Applies a single edit command to an input field state and returns the new
 * state. The function is pure — it does not mutate `state`.
 *
 * All caret indices are clamped to `[0, value.length]`. `maxLength` is
 * enforced by `insert` and `setValue` (excess characters are silently dropped).
 *
 * @param state - Current input field state.
 * @param command - The edit operation to apply.
 * @returns A new {@link UiInputState} object reflecting the command result.
 */
export function applyEditCommand(
  state: UiInputState,
  command: EditCommand,
): UiInputState {
  if (command.type === 'insert') {
    return applyInsert(state, command.text);
  }

  if (command.type === 'backspace') {
    return applyBackspace(state);
  }

  if (command.type === 'delete') {
    return applyDelete(state);
  }

  if (command.type === 'moveCaret') {
    return applyMoveCaret(state, command);
  }

  if (command.type === 'moveCaretWord') {
    return applyMoveCaretWord(state, command);
  }

  if (command.type === 'home') {
    return applyHome(state, command);
  }

  if (command.type === 'end') {
    return applyEnd(state, command);
  }

  if (command.type === 'selectAll') {
    return { ...state, caretIndex: state.value.length, selectionAnchor: 0 };
  }

  return applySetValue(state, command);
}
