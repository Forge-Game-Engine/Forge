import React, { FC, ReactNode } from 'react';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import { useGame } from '@site/src/hooks/useGame';
import styles from './_Demo.module.css';
import { cleanCodeSnippet } from '@site/src/utils/clean-code-snippet';
import { Game } from '@forge-game-engine/forge/ecs';

interface DemoProps {
  metaData: {
    title: string;
    description: string;
  };
  interactions: ReactNode;
  header: string;
  blurb: string;
  createGame: () => Promise<Game>;
  code: string;
}

export const Demo: FC<DemoProps> = ({
  metaData,
  blurb,
  interactions,
  header,
  createGame,
  code,
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
          <CodeBlock language="typescript" className={styles.codeBlock}>
            {cleanCodeSnippet(code)}
          </CodeBlock>
        </div>
        <p>{blurb}</p>
      </div>
    </Layout>
  );
};
