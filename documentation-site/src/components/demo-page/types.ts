import { ReactNode } from 'react';

/**
 * One input that triggers a control: a key's label (`'→'`, `'D'`,
 * `'Space'`), or a mouse or gamepad input described in a few words.
 */
export type DemoInput =
  string | { device: 'mouse' | 'gamepad' | 'touch'; label: string };

/**
 * One action the player can take, and the inputs that trigger it.
 * Alternatives in `inputs` are shown joined by "or".
 */
export interface DemoControl {
  inputs: DemoInput[];
  action: string;
  /** A short note on what the action does in special situations. */
  detail?: string;
}

/**
 * A source file shown in the code explorer.
 */
export interface DemoFile {
  name: string;
  /** One sentence on what the file does, shown above its code. */
  summary: string;
  content: string;
}

/**
 * Files listed together under one heading in the code explorer.
 */
export interface DemoFileGroup {
  title: string;
  files: DemoFile[];
}

/**
 * One point in a demo's "How it works" list, optionally linked to the file
 * that implements it.
 */
export interface DemoHighlight {
  text: ReactNode;
  file?: string;
}

/**
 * A link to the documentation for a feature the demo uses.
 */
export interface DemoDocLink {
  label: string;
  to: string;
}

/**
 * One entry in a {@link DemoLegend}: a marker (a color swatch, a number)
 * and what it stands for.
 */
export interface DemoLegendItem {
  marker: ReactNode;
  label: string;
}
