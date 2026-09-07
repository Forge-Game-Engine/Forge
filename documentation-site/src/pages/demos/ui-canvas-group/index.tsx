import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createCanvasGroupGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';

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

export default function UiCanvasGroup(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createCanvasGroupGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI Canvas Group',
        description:
          'A demo showcasing CanvasGroupEcsComponent fading and disabling a whole nested UI subtree at once.',
      }}
      header="UI Canvas Group"
      blurb="A single CanvasGroupEcsComponent lives on the outer modal panel. Toggling 'Disable modal' fades and disables everything under it in one write - the nested card, its label, its long description, and its 'Confirm' button (a real createButton) - two and three levels down in the tree. createUiCanvasGroupEcsSystem walks the whole subtree, not just direct children, so alpha/interactable/blocksRaycasts propagate arbitrarily deep: 'Confirm' becomes genuinely unable to be clicked while disabled, not just dimmed. The toggle itself lives outside the group, so it stays fully opaque and clickable the whole time."
      createGame={createGame}
      interactions={
        <InteractionInstruction
          displayElement={
            <div style={badgeStyle}>
              <i className="fa-solid fa-computer-mouse" />
            </div>
          }
          text="Click 'Disable modal' to fade the whole card."
        />
      }
      codeFiles={[{ name: 'game.ts', content: gameCode }]}
    />
  );
}
