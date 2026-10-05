import React, { JSX } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createTextMaterialsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createTextMaterialsCode from '!!raw-loader!./_create-text-materials';
import animateTextMaterialsCode from '!!raw-loader!./_animate-text-materials.system';
import shimmerShaderCode from '!!raw-loader!./_shimmer.shader';
import dissolveShaderCode from '!!raw-loader!./_dissolve.shader';
import flickerShaderCode from '!!raw-loader!./_flicker.shader';

import { Demo } from '@site/src/components/Demo';

export default function TextMaterials(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;

  return (
    <Demo
      metaData={{
        title: 'Text Materials Demo',
        description:
          'A demo showcasing text drawn with custom fragment shaders.',
      }}
      header="Text Materials"
      blurb="Each word here is ordinary text with its own material, made by createTextMaterial from a fragment shader: a highlight sweeping across the word, a noise dissolve with a glowing edge, and a flicker that tears bands of the word sideways and splits its color. Every shader includes the engine's msdf helpers and builds on msdfCoverage, the engine binds the font atlas for each font, and a small system animates each material's own uniforms."
      createGame={() => createTextMaterialsGame(fontAtlasUrl)}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'create-text-materials.ts', content: createTextMaterialsCode },
        { name: 'shimmer.shader.ts', content: shimmerShaderCode },
        { name: 'dissolve.shader.ts', content: dissolveShaderCode },
        { name: 'flicker.shader.ts', content: flickerShaderCode },
        {
          name: 'animate-text-materials.system.ts',
          content: animateTextMaterialsCode,
        },
      ]}
    />
  );
}
