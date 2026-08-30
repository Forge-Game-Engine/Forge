/** The DOM element id every generated game bootstraps `createGame` against. */
export const gameContainerId = 'game';

/**
 * Builds the `index.html` shipped alongside the bundled `game.js` in the
 * downloaded zip.
 * @param title - The document title.
 */
export function generateIndexHtml(title: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
      #${gameContainerId} { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="${gameContainerId}"></div>
    <script type="module" src="./game.js"></script>
  </body>
</html>
`;
}
