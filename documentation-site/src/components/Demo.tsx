import React, { FC, ReactNode, useRef } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import clsx from 'clsx';
import { useGame } from '@site/src/hooks/useGame';
import { useFullscreen } from '@site/src/hooks/useFullscreen';
import { demoCategories } from '@site/src/data/demo-categories';
import styles from './_Demo.module.css';
import { Game } from '@forge-game-engine/forge/utilities';
import { CodeSelector } from './_CodeSelector';

interface CodeFile {
  name: string;
  content: string;
}

interface DemoProps {
  metaData: {
    title: string;
    description: string;
  };
  interactions?: ReactNode;
  header: string;
  blurb: string;
  createGame: () => Promise<Game>;
  codeFiles: CodeFile[];
}

export const Demo: FC<DemoProps> = ({
  metaData,
  blurb,
  interactions,
  header,
  createGame,
  codeFiles,
}) => {
  const demoBoxRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(demoBoxRef);

  // Restarting the game on fullscreen toggle re-initializes it against the
  // container's current size, since the game has no way to resize in place.
  useGame(createGame, isFullscreen);

  // The category page a demo was navigated from is threaded through as a
  // `from` query param (see `DemoCard`), so the back button returns to the
  // specific category the user was browsing rather than always the full
  // demo catalogue.
  const location = useLocation();
  const fromCategory = demoCategories.find(
    (category) =>
      category.slug === new URLSearchParams(location.search).get('from'),
  );
  const backLink = fromCategory
    ? {
        to: `/demos/category/${fromCategory.slug}`,
        label: `← Back to ${fromCategory.title}`,
      }
    : { to: '/demos', label: '← All demos' };

  return (
    <Layout
      title={metaData.title}
      description={metaData.description}
      wrapperClassName={styles.wrapper}
    >
      <div className={styles.container}>
        <Link to={backLink.to} className={styles.back}>
          {backLink.label}
        </Link>
        <h1>{header}</h1>
        {interactions}
        <div className={styles.demoContainer}>
          <div id="demo-game" ref={demoBoxRef} className={styles.demoBox}>
            <button
              type="button"
              className={styles.fullscreenButton}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <i
                className={clsx(
                  'fa-solid',
                  isFullscreen ? 'fa-compress' : 'fa-expand',
                )}
              ></i>
            </button>
          </div>
          <CodeSelector codeFiles={codeFiles} />
        </div>
        <p>{blurb}</p>
      </div>
    </Layout>
  );
};
