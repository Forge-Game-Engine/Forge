import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createNestedResizeGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import liveMotionComponentCode from '!!raw-loader!./_live-motion.component';
import liveMotionSystemCode from '!!raw-loader!./_live-motion.system';

import { Demo } from '@site/src/components/Demo';

export default function UiNestedResize(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createNestedResizeGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI Nested Resize',
        description:
          'A demo showcasing nested RectTransformEcsComponent anchors reacting live to a parent panel that resizes and moves every frame - stretch anchors resize through multiple levels of nesting, point anchors reposition without resizing.',
      }}
      header="UI Nested Resize"
      blurb="A basic options menu window whose size and position both oscillate every frame (no user input - plain sine waves on four independent axes, see live-motion.system.ts), with four levels of nesting reacting to it: a stretchAll content panel that fills and resizes with it wherever it currently is - hosting a Music slider, a Fullscreen toggle, and a Back button - a stretchTop title bar nested a level deeper still that stretches its width along with its content parent, and a middleRight close button nested a level deeper again that keeps a constant size while sliding along the title bar's moving right edge - a point anchor still resolves correctly this many levels down. A corner accent and a version tag, both parented directly to the window, round it out, keeping a constant size while sliding to stay pinned to their corner. Nothing here reacts to the resize/move directly except the window's own component - every child's behavior falls straight out of the anchor it was given to createUiLayoutEcsSystem, at any depth of nesting."
      createGame={createGame}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        {
          name: 'live-motion.component.ts',
          content: liveMotionComponentCode,
        },
        {
          name: 'live-motion.system.ts',
          content: liveMotionSystemCode,
        },
      ]}
    />
  );
}
