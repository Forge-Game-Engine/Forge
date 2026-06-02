import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <img
          src={`${siteConfig.baseUrl}/img/forge-logo.png`}
          alt="Site Logo"
          style={{ display: 'block', margin: '0 auto 1rem', maxWidth: 160 }}
        />
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/docs/intro">
            Get Started! 🔥
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/category/documentation"
          >
            Documentation
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description="Forge is a browser-based, code only game engine. It has everything you would expect from an engine, including rendering, audio, input, animations, ECS, etc."
    >
      <HomepageHeader />
    </Layout>
  );
}
