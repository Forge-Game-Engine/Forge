import React, { JSX } from 'react';
import { createNestedResizeGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createWindowFrameCode from '!!raw-loader!./_create-window-frame';
import createTitleBarCode from '!!raw-loader!./_create-title-bar';
import createOptionsContentCode from '!!raw-loader!./_create-options-content';
import createCornerDecorationsCode from '!!raw-loader!./_create-corner-decorations';
import loadDemoSpritesCode from '!!raw-loader!./_load-demo-sprites';
import liveMotionComponentCode from '!!raw-loader!./_live-motion.component';
import liveMotionSystemCode from '!!raw-loader!./_live-motion.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiNestedResize(): JSX.Element {
  return (
    <DemoPage
      slug="ui-nested-resize"
      createGame={createNestedResizeGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Drag or click' }],
          action: 'Use the slider, toggle and Back button',
          detail: 'They keep working while the window moves',
        },
      ]}
      highlights={[
        {
          text: 'Only the window itself is animated: four sine waves move and resize it every frame, and nothing else reacts to that in code.',
          file: 'live-motion.system.ts',
        },
        {
          text: 'A stretchAll content panel fills the window, so it resizes on both axes and follows it wherever it goes.',
          file: 'create-window-frame.ts',
        },
        {
          text: 'A stretchTop title bar one level deeper follows only the width, and its middleRight close button slides along its edge at a fixed size.',
          file: 'create-title-bar.ts',
        },
        {
          text: 'The version tag is anchored to a corner of the window, so it keeps its size and stays pinned as the edges move.',
          file: 'create-corner-decorations.ts',
        },
        {
          text: 'The motion system runs before the layout system, so each frame lays out from the size it just wrote.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Anchors and layout', to: '/docs/docs/ui/anchors-and-layout' },
        { label: 'Controls', to: '/docs/docs/ui/controls' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the canvas, builds the options window and registers the motion system.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the window',
          files: [
            {
              name: 'create-window-frame.ts',
              summary:
                'Creates the moving window panel and the stretchAll content panel inside it.',
              content: createWindowFrameCode,
            },
            {
              name: 'create-title-bar.ts',
              summary:
                'Creates the stretchTop title bar and its middleRight close button.',
              content: createTitleBarCode,
            },
            {
              name: 'create-options-content.ts',
              summary:
                'Creates the Music slider, Fullscreen toggle and Back button.',
              content: createOptionsContentCode,
            },
            {
              name: 'create-corner-decorations.ts',
              summary: "Creates the version tag pinned to the window's corner.",
              content: createCornerDecorationsCode,
            },
            {
              name: 'load-demo-sprites.ts',
              summary: 'Loads every sprite the window and its controls use.',
              content: loadDemoSpritesCode,
            },
          ],
        },
        {
          title: 'Live motion',
          files: [
            {
              name: 'live-motion.component.ts',
              summary:
                'The range and period of each axis the window moves and resizes on.',
              content: liveMotionComponentCode,
            },
            {
              name: 'live-motion.system.ts',
              summary:
                "Writes the window's size and position from a sine wave every frame.",
              content: liveMotionSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
