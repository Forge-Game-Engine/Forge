import React, { JSX } from 'react';
import { createGame } from './_create-game';
import code from '!!raw-loader!./_create-game';
import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { ScrollWheel } from '@site/src/components/_ScrollWheel';

export default function Rendering(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Rendering Demo',
        description: 'A demo showcasing rendering capabilities.',
      }}
      header="Rendering"
      blurb="This demo showcases the engine’s rendering pipeline under real load. It creates a single sprite and renders 8,000 independent entities using GPU instancing, each with its own position, rotation, and scale. The result is a dense starfield that runs at max frame rate, demonstrating how the renderer efficiently batches and draws large numbers of entities with minimal overhead. Inputs, world setup, and other boilerplate exist only to support the scene—the focus is purely on instanced rendering performance and scalability."
      createGame={createGame}
      code={code}
      interactions={
        <InteractionInstruction displayElement={<ScrollWheel />} text="Zoom" />
      }
    />
  );
}
