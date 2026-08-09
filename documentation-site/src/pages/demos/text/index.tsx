import React, { JSX } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createTextGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createLabelsCode from '!!raw-loader!./_create-labels';
import counterComponentCode from '!!raw-loader!./_counter.component';
import counterSystemCode from '!!raw-loader!./_counter.system';

import { Demo } from '@site/src/components/Demo';

export default function Text(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/text-demo/liberation-sans.json`;

  return (
    <Demo
      metaData={{
        title: 'Text Rendering Demo',
        description:
          'A demo showcasing MSDF text rendering with addTextComponent and createTextShapingEcsSystem.',
      }}
      header="Text Rendering"
      blurb="Three TextEcsComponent entities (Liberation Sans, SIL OFL 1.1) rendered through the MSDF text pipeline: a heading, a subheading, and a counter that increments once per second by writing directly to its TextEcsComponent.text. createTextShapingEcsSystem only re-shapes the glyphs of the entity whose text actually changed that tick, so the heading and subheading are shaped once and never again."
      createGame={() => createTextGame(fontAtlasUrl)}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'create-labels.ts', content: createLabelsCode },
        { name: 'counter.component.ts', content: counterComponentCode },
        { name: 'counter.system.ts', content: counterSystemCode },
      ]}
    />
  );
}
