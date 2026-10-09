import React, { FC, ReactNode, useRef } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { CreateDemoGame, useGame } from '@site/src/hooks/useGame';
import { useFullscreen } from '@site/src/hooks/useFullscreen';
import { useDemoBackLink } from '@site/src/hooks/useDemoBackLink';
import styles from './_Demo.module.css';
import { CodeSelector } from './_CodeSelector';
import { FullscreenButton } from './_FullscreenButton';

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
  createGame: CreateDemoGame;
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

  // `Game` keeps its render context sized to its container itself (via a
  // `ResizeObserver`), so entering/exiting fullscreen resizes the running
  // game in place instead of needing a restart.
  useGame(createGame);

  const backLink = useDemoBackLink();

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
            <FullscreenButton
              isFullscreen={isFullscreen}
              onToggle={toggleFullscreen}
            />
          </div>
          <CodeSelector codeFiles={codeFiles} />
        </div>
        <p>{blurb}</p>
      </div>
    </Layout>
  );
};
