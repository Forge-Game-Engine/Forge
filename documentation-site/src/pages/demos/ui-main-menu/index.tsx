import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createUiMainMenuGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import mainMenuCode from '!!raw-loader!./_create-main-menu';
import flagshipPanelCode from '!!raw-loader!./_create-flagship-panel';
import paletteCode from '!!raw-loader!./_palette';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

const badgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: '50%',
  backgroundColor: 'var(--ifm-color-emphasis-300)',
  fontSize: 12,
};

export default function UiMainMenu(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createUiMainMenuGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI Main Menu',
        description:
          'A full main-menu screen built from the ui module - hand-composed numbered menu rows, a vertical layout group with content size fitting, a progress bar, and a button - reproducing a flat sci-fi reference design.',
      }}
      header="UI Main Menu"
      blurb="A complete main-menu screen, built entirely from the ui module against a flat sci-fi reference design. The six numbered rows (createMainMenu) are hand-composed rather than built with createButton, since a menu row needs two independently positioned labels - a dim index and a bright title - where createButton only supports one centered label; each row otherwise carries the same UiInteractableEcsComponent/UiColorTransitionEcsComponent pair createButton itself attaches, stacked with a VerticalLayoutGroupEcsComponent inside a ContentSizeFitterEcsComponent container. The flagship panel (createFlagshipPanel) shows a createProgressBar fleet-strength meter and a createButton Deploy call to action. Click a row, or use the arrow keys to move focus (the first row starts focused, matching the reference) and Enter/Space to invoke - either path updates the status line above the menu, and Deploy updates it too."
      createGame={createGame}
      interactions={
        <>
          <InteractionInstruction
            displayElement={
              <div style={badgeStyle}>
                <i className="fa-solid fa-computer-mouse" />
              </div>
            }
            text="Click a menu row or the Deploy button."
          />
          <InteractionInstruction
            displayElement={
              <>
                <KeyboardKey keyCode="↑" />
                <KeyboardKey keyCode="↓" />
              </>
            }
            text="Move focus between menu rows."
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="⏎" />}
            text="Invoke the focused row or button."
          />
        </>
      }
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'create-main-menu.ts', content: mainMenuCode },
        { name: 'create-flagship-panel.ts', content: flagshipPanelCode },
        { name: 'palette.ts', content: paletteCode },
      ]}
    />
  );
}
