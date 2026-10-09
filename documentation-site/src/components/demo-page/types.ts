import { ReactNode } from 'react';

/**
 * One action the player can take, and the keys (or other inputs) that
 * trigger it. Alternatives in `keys` are shown joined by "or".
 */
export interface DemoControl {
  keys: string[];
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
