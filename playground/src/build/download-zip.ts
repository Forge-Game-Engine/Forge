import { strToU8, zipSync } from 'fflate';

/**
 * Zips the generated `index.html` and bundled `game.js` and triggers a
 * browser download, entirely client-side.
 */
export function downloadGameZip(
  htmlSource: string,
  jsSource: string,
  filename = 'forge-game.zip',
): void {
  const zipped = zipSync(
    {
      'index.html': strToU8(htmlSource),
      'game.js': strToU8(jsSource),
    },
    { level: 6 },
  );

  const blob = new Blob([zipped.buffer as ArrayBuffer], {
    type: 'application/zip',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
