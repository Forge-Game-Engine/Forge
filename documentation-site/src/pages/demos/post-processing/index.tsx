import React, { JSX } from 'react';
import { createPostProcessingGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import postProcessingCode from '!!raw-loader!./_create-post-processing';
import glitchShaderCode from '!!raw-loader!./_glitch.shader';
import vignetteShaderCode from '!!raw-loader!./_vignette.shader';
import glitchComponentCode from '!!raw-loader!./_glitch.component';
import glitchSystemCode from '!!raw-loader!./_glitch.system';
import sceneCode from '!!raw-loader!./_create-scene';

import { Demo } from '@site/src/components/Demo';

export default function PostProcessing(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Custom Post-Processing Demo',
        description:
          'A demo showcasing custom full-screen shaders chained over a camera image.',
      }}
      header="Custom Post-Processing"
      blurb="This demo runs two custom full-screen shaders over a camera's image with a PostProcessEcsComponent: a glitch that tears the picture into bands and splits its colors in bursts, then a vignette with scanlines over the glitched result. Each pass is just a Material whose fragment shader samples u_texture; the post-processing system chains them, and a small system of the demo's own animates the glitch's uniforms."
      createGame={createPostProcessingGame}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'create-post-processing.ts', content: postProcessingCode },
        { name: 'glitch.shader.ts', content: glitchShaderCode },
        { name: 'vignette.shader.ts', content: vignetteShaderCode },
        { name: 'glitch.component.ts', content: glitchComponentCode },
        { name: 'glitch.system.ts', content: glitchSystemCode },
        { name: 'create-scene.ts', content: sceneCode },
      ]}
    />
  );
}
