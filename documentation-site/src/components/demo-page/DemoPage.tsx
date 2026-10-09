import React, { FC, ReactNode, useEffect, useRef, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { CreateDemoGame, useGame } from '@site/src/hooks/useGame';
import { useFullscreen } from '@site/src/hooks/useFullscreen';
import { useDemoBackLink } from '@site/src/hooks/useDemoBackLink';
import { usePreventPageScrollKeys } from '@site/src/hooks/usePreventPageScrollKeys';
import { FullscreenButton } from '@site/src/components/_FullscreenButton';
import styles from './DemoPage.module.css';
import { CodeExplorer } from './_CodeExplorer';
import { DemoControls } from './_DemoControls';
import {
  DemoControl,
  DemoDocLink,
  DemoFile,
  DemoFileGroup,
  DemoHighlight,
} from './types';

export type {
  DemoControl,
  DemoDocLink,
  DemoFile,
  DemoFileGroup,
  DemoHighlight,
};

interface DemoPageProps {
  title: string;
  /** One or two sentences: what the demo shows. Also the page's meta description. */
  summary: string;
  createGame: CreateDemoGame;
  controls: DemoControl[];
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
 * A demo page: the running game with its controls and a short explanation,
 * and a code explorer for the demo's source below.
 */
export const DemoPage: FC<DemoPageProps> = ({
  title,
  summary,
  createGame,
  controls,
  highlights,
  docLinks = [],
  fileGroups,
}) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const explorerRef = useRef<HTMLElement>(null);
  const backLink = useDemoBackLink();
  const { isFullscreen, toggleFullscreen } = useFullscreen(gameRef);
  const [hasFocus, setHasFocus] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState(
    fileGroups[0].files[0].name,
  );

  useGame(createGame);
  usePreventPageScrollKeys(gameRef);

  // Focus the game straight away, so the controls work without a click and
  // the arrow keys drive the game instead of scrolling the page.
  useEffect(() => {
    gameRef.current?.focus({ preventScroll: true });
  }, []);

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
    <Layout title={title} description={summary}>
      <main className={styles.page}>
        <Link to={backLink.to} className={styles.back}>
          {backLink.label}
        </Link>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.summary}>{summary}</p>
        </header>

        <div className={styles.stage}>
          <div
            id="demo-game"
            ref={gameRef}
            className={styles.game}
            tabIndex={0}
            aria-label={`${title} game`}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setHasFocus(false)}
          >
            <FullscreenButton
              isFullscreen={isFullscreen}
              onToggle={toggleFullscreen}
            />
            <div
              className={clsx(
                styles.focusHint,
                hasFocus && styles.focusHintHidden,
              )}
              aria-hidden="true"
            >
              <i className="fa-solid fa-hand-pointer"></i> Click to play
            </div>
          </div>

          <aside className={styles.sidebar}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <i className="fa-solid fa-keyboard"></i> Controls
              </h2>
              <DemoControls controls={controls} />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <i className="fa-solid fa-lightbulb"></i> How it works
              </h2>
              <ul className={styles.highlights}>
                {highlights.map(({ text, file }, index) => (
                  <li key={index}>
                    {text}
                    {file && (
                      <button
                        type="button"
                        className={styles.fileLink}
                        onClick={() => openFile(file)}
                      >
                        <i className="fa-solid fa-code"></i> {file}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {docLinks.length > 0 && (
                <div className={styles.docLinks}>
                  <span>Docs:</span>
                  {docLinks.map((docLink) => (
                    <Link key={docLink.to} to={docLink.to}>
                      {docLink.label}
                    </Link>
                  ))}
                </div>
              )}
            </section>
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
