import * as monaco from 'monaco-editor';
import {
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  typescriptDefaults,
} from 'monaco-editor/languages/features/typescript/register.js';

import { registerForgeTypes } from './forge-types.js';
import { configureMonacoWorkers } from './monaco-workers.js';

const gameFileUri = monaco.Uri.parse('file:///game.ts');

/**
 * Creates the Monaco editor the playground's single game file is edited
 * in, configured with TypeScript's module resolution rules and Forge's own
 * type declarations so autocomplete, hover, and inline diagnostics work
 * against Forge's real public API.
 * @param container - The element the editor mounts into.
 * @param initialSource - The starting contents of the game file.
 */
export function createGameEditor(
  container: HTMLElement,
  initialSource: string,
): monaco.editor.IStandaloneCodeEditor {
  configureMonacoWorkers();

  const defaults = typescriptDefaults;

  defaults.setCompilerOptions({
    target: ScriptTarget.ESNext,
    module: ModuleKind.ESNext,
    moduleResolution: ModuleResolutionKind.NodeJs,
    esModuleInterop: true,
    allowNonTsExtensions: true,
    strict: true,
    skipLibCheck: true,
    lib: ['esnext', 'dom', 'dom.iterable'],
  });
  defaults.setEagerModelSync(true);

  registerForgeTypes();

  const model = monaco.editor.createModel(
    initialSource,
    'typescript',
    gameFileUri,
  );

  return monaco.editor.create(container, {
    model,
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    tabSize: 2,
  });
}

/** Reads the current game source out of the editor. */
export function getEditorSource(
  editor: monaco.editor.IStandaloneCodeEditor,
): string {
  return editor.getModel()?.getValue() ?? '';
}
