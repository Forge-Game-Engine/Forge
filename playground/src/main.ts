import { downloadGameZip } from './build/download-zip.js';
import { generateIndexHtml } from './build/html-template.js';
import { BundleGameError, bundleGame } from './build/bundle-game.js';
import { createGameEditor, getEditorSource } from './editor/create-editor.js';
import { typeCheckGameSource } from './editor/type-check.js';
import { defaultSource } from './default-source.js';
import './style.css';

const app = document.getElementById('app');

if (!app) {
  throw new Error('Missing #app root element.');
}

app.innerHTML = `
  <div class="toolbar">
    <h1>Forge Playground</h1>
    <button class="build-button" id="build-button">Build</button>
    <span class="status" id="status"></span>
  </div>
  <div class="main">
    <div id="editor-container"></div>
    <div class="log" id="log"><span class="empty">Build output appears here.</span></div>
  </div>
`;

const editorContainer = document.getElementById('editor-container')!;
const buildButton = document.getElementById(
  'build-button',
) as HTMLButtonElement;
const status = document.getElementById('status')!;
const log = document.getElementById('log')!;

const editor = createGameEditor(editorContainer, defaultSource);

function setStatus(message: string): void {
  status.textContent = message;
}

function renderLog(lines: { text: string; kind: 'error' | 'success' }[]): void {
  if (lines.length === 0) {
    log.innerHTML = '<span class="empty">Build output appears here.</span>';

    return;
  }

  log.innerHTML = lines
    .map((line) => `<div class="${line.kind}">${escapeHtml(line.text)}</div>`)
    .join('');
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');

  div.textContent = text;

  return div.innerHTML;
}

async function handleBuild(): Promise<void> {
  buildButton.disabled = true;
  setStatus('Type-checking...');
  renderLog([]);

  try {
    const source = getEditorSource(editor);
    const diagnostics = typeCheckGameSource(source);

    if (diagnostics.length > 0) {
      setStatus(`${diagnostics.length} type error(s)`);
      renderLog(
        diagnostics.map((diagnostic) => ({
          kind: 'error',
          text: `game.ts:${diagnostic.line}:${diagnostic.column} - ${diagnostic.message}`,
        })),
      );

      return;
    }

    setStatus('Bundling...');

    const { code } = await bundleGame(source);
    const html = generateIndexHtml('Forge Game');

    downloadGameZip(html, code);

    setStatus('Downloaded forge-game.zip');
    renderLog([{ kind: 'success', text: 'Build succeeded.' }]);
  } catch (error) {
    if (error instanceof BundleGameError) {
      setStatus(`${error.errors.length} build error(s)`);
      renderLog(
        error.errors.map((buildError) => ({
          kind: 'error',
          text: buildError.location
            ? `game.ts:${buildError.location.line}:${buildError.location.column} - ${buildError.text}`
            : buildError.text,
        })),
      );

      return;
    }

    const message = error instanceof Error ? error.message : String(error);

    setStatus('Build failed');
    renderLog([{ kind: 'error', text: message }]);
  } finally {
    buildButton.disabled = false;
  }
}

buildButton.addEventListener('click', () => {
  void handleBuild();
});
