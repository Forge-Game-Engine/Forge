import React, { FC, ReactNode, useRef, useState } from 'react';
import Layout from '@theme/Layout';
import { CreateDemoGame } from '@site/src/hooks/useGame';
import { demos } from '@site/src/data/demos';
import styles from './DemoPage.module.css';
import { CodeExplorer } from './CodeExplorer';
import { DemoControls } from './DemoControls';
import { DemoGame } from './DemoGame';
import { DemoHeader } from './DemoHeader';
import { DemoHighlights } from './DemoHighlights';
import { DemoPanel } from './DemoPanel';
import {
  DemoControl,
  DemoDocLink,
  DemoFile,
  DemoFileGroup,
  DemoHighlight,
} from './types';

interface DemoPageProps {
  /** The demo's entry in `src/data/demos.ts`, which holds its title and summary. */
  slug: string;
  createGame: CreateDemoGame;
  /** Leave out for a demo you only watch. */
  controls?: DemoControl[];
  /**
   * Extra sidebar content shown after the controls, such as live settings
   * or a legend. Wrap each in a `DemoPanel`.
   */
  panels?: ReactNode;
  /** The few ideas a reader should take away, each linked to its code. */
  highlights: DemoHighlight[];
  docLinks?: DemoDocLink[];
  /** The first group's first file is the one shown when the page opens. */
  fileGroups: DemoFileGroup[];
}

const findFile = (fileGroups: DemoFileGroup[], name: string): DemoFile => {
  for (const group of fileGroups) {
    const file = group.files.find((candidate) => candidate.name === name);

    if (file) {
      return file;
    }
  }

  throw new Error(`The demo has no source file named "${name}".`);
};

/**
 * A demo page: the running game with its controls and a short explanation
 * beside it, and a code explorer for the demo's source below.
 */
export const DemoPage: FC<DemoPageProps> = ({
  slug,
  createGame,
  controls = [],
  panels,
  highlights,
  docLinks = [],
  fileGroups,
}) => {
  const explorerRef = useRef<HTMLElement>(null);
  const [selectedFileName, setSelectedFileName] = useState(
    fileGroups[0].files[0].name,
  );
  const demo = demos.find((candidate) => candidate.slug === slug);

  if (!demo) {
    throw new Error(`No demo with slug "${slug}" in src/data/demos.ts.`);
  }

  for (const highlight of highlights) {
    if (highlight.file) {
      findFile(fileGroups, highlight.file);
    }
  }

  const openFile = (fileName: string): void => {
    setSelectedFileName(fileName);
    explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Layout title={`${demo.title} Demo`} description={demo.description}>
      <main className={styles.page}>
        <DemoHeader
          title={demo.title}
          summary={demo.description}
          docLinks={docLinks}
        />

        <div className={styles.stage}>
          <DemoGame title={demo.title} createGame={createGame} />

          <aside className={styles.sidebar}>
            {controls.length > 0 && (
              <DemoPanel title="Controls" icon="fa-keyboard">
                <DemoControls controls={controls} />
              </DemoPanel>
            )}
            {panels}
            <DemoPanel title="How it works" icon="fa-lightbulb">
              <DemoHighlights highlights={highlights} onOpenFile={openFile} />
            </DemoPanel>
          </aside>
        </div>

        <section ref={explorerRef} className={styles.source}>
          <h2 className={styles.sourceTitle}>Source code</h2>
          <CodeExplorer
            fileGroups={fileGroups}
            selectedFile={findFile(fileGroups, selectedFileName)}
            onSelectFile={setSelectedFileName}
          />
        </section>
      </main>
    </Layout>
  );
};
