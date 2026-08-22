import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createLayoutGroupsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import menuCode from '!!raw-loader!./_create-menu';
import toolbarCode from '!!raw-loader!./_create-toolbar';
import inventoryGridCode from '!!raw-loader!./_create-inventory-grid';

import { Demo } from '@site/src/components/Demo';

export default function LayoutGroups(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createLayoutGroupsGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'Layout Groups',
        description:
          'A demo showcasing horizontal, vertical, and grid layout groups, plus content size fitting, from the ui module.',
      }}
      header="Layout Groups"
      blurb="Three panels, each arranged automatically instead of by hand. 'Menu' stacks three buttons with a VerticalLayoutGroupEcsComponent, and shrink-wraps its own size to fit them via a ContentSizeFitterEcsComponent - resize a button and the panel follows. 'Toolbar' spaces a row of icons evenly with a HorizontalLayoutGroupEcsComponent. 'Inventory' places eight cells into a 4-column grid with a GridLayoutGroupEcsComponent. None of the arranged children set their own anchoredPosition or sizeDelta - createUiLayoutGroupEcsSystem computes all of it, every frame."
      createGame={createGame}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'create-menu.ts', content: menuCode },
        { name: 'create-toolbar.ts', content: toolbarCode },
        { name: 'create-inventory-grid.ts', content: inventoryGridCode },
      ]}
    />
  );
}
