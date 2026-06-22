import React, { JSX } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { createUiShowcaseGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import layoutSectionCode from '!!raw-loader!./_create-layout-section';
import stylingSectionCode from '!!raw-loader!./_create-styling-section';
import textSectionCode from '!!raw-loader!./_create-text-section';
import widgetsSectionCode from '!!raw-loader!./_create-widgets-section';
import advancedSectionCode from '!!raw-loader!./_create-advanced-section';
import animationSectionCode from '!!raw-loader!./_create-animation-section';
import scaleSectionCode from '!!raw-loader!./_create-scale-section';
import themeCode from '!!raw-loader!./_theme';
import stripesShaderCode from '!!raw-loader!./_stripes-shader';

import { Demo } from '@site/src/components/Demo';

export default function UiShowcase(): JSX.Element {
  const fontJsonUrl = useBaseUrl('/fonts/inter-regular.json');
  const fontAtlasUrl = useBaseUrl('/fonts/inter-regular.png');

  return (
    <Demo
      metaData={{
        title: 'UI Showcase Demo',
        description: 'A consolidated showcase of every Forge UI feature.',
      }}
      header="UI Showcase"
      blurb="This demo brings together every feature of the Forge UI stack in one scrollable scene: anchor-based layout, default and custom shaders, clipping, SDF text, buttons/checkboxes/sliders with full keyboard and focus support, scroll groups, an input box, a dropdown, the property-animation presets, and a live element-count slider for stress testing batching. Use the theme button in the top right to re-tint the themed widgets, and tab through the controls to see keyboard focus in action."
      createGame={() => createUiShowcaseGame(fontJsonUrl, fontAtlasUrl)}
      codeFiles={[
        { name: 'create-game.ts', content: gameCode },
        { name: 'theme.ts', content: themeCode },
        { name: 'create-layout-section.ts', content: layoutSectionCode },
        { name: 'create-styling-section.ts', content: stylingSectionCode },
        { name: 'stripes-shader.ts', content: stripesShaderCode },
        { name: 'create-text-section.ts', content: textSectionCode },
        { name: 'create-widgets-section.ts', content: widgetsSectionCode },
        { name: 'create-advanced-section.ts', content: advancedSectionCode },
        { name: 'create-animation-section.ts', content: animationSectionCode },
        { name: 'create-scale-section.ts', content: scaleSectionCode },
      ]}
    />
  );
}
