import React, { JSX } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { createTextGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createLabelsCode from '!!raw-loader!./_create-labels';
import elapsedCounterComponentCode from '!!raw-loader!./_elapsed-counter.component';
import elapsedCounterSystemCode from '!!raw-loader!./_elapsed-counter.system';

import { Demo } from '@site/src/components/Demo';

export default function Text(): JSX.Element {
  const fontJsonUrl = useBaseUrl(
    'fonts/liberation-sans/liberation-sans-msdf.json',
  );
  const fontPngUrl = useBaseUrl(
    'fonts/liberation-sans/liberation-sans-msdf.png',
  );

  return (
    <Demo
      metaData={{
        title: 'Text Demo',
        description:
          'A demo showcasing MSDF font atlas text rendering: word-wrap, alignment, and cheap per-frame text updates.',
      }}
      header="Text"
      blurb="Text rendered from an MSDF font atlas (Liberation Sans), showing word-wrap and alignment side by side, plus a live counter to show that updating a label's text every frame is cheap - only entities whose text actually changed get re-shaped."
      createGame={() => createTextGame(fontJsonUrl, fontPngUrl)}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'create-labels.ts', content: createLabelsCode },
        {
          name: 'elapsed-counter.component.ts',
          content: elapsedCounterComponentCode,
        },
        {
          name: 'elapsed-counter.system.ts',
          content: elapsedCounterSystemCode,
        },
      ]}
    />
  );
}
