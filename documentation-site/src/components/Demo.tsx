import React, { FC, ReactNode } from 'react';
import Layout from '@theme/Layout';
import { useGame } from '@site/src/hooks/useGame';
import styles from './_Demo.module.css';
import { Game } from '@forge-game-engine/forge/ecs';
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
  interactions: ReactNode;
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
  useGame(createGame);

  return (
    <Layout
      title={metaData.title}
      description={metaData.description}
      wrapperClassName={styles.wrapper}
    >
      <div className={styles.container}>
        <h1>{header}</h1>
        {interactions}
        <div className={styles.demoContainer}>
          <div id="demo-game" className={styles.demoBox}></div>
          <CodeSelector codeFiles={codeFiles} />
        </div>
        <p>{blurb}</p>
      </div>
    </Layout>
  );
};
