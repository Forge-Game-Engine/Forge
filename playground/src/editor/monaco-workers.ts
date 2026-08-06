import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import TypeScriptWorker from 'monaco-editor/language/typescript/ts.worker.js?worker';

let configured = false;

/**
 * Wires up Monaco's web workers under Vite (Monaco doesn't do this itself -
 * it expects a host-provided `MonacoEnvironment.getWorker`). Must run
 * before any editor or model is created.
 */
export function configureMonacoWorkers(): void {
  if (configured) {
    return;
  }

  configured = true;

  self.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === 'typescript' || label === 'javascript') {
        return new TypeScriptWorker();
      }

      return new EditorWorker();
    },
  };
}
