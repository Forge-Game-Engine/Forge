import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import { DemoCard } from '@site/src/components/DemoCard';
import { ModuleIcon, ModuleIconName } from '@site/src/components/ModuleIcon';
import styles from '@site/src/components/home/Home.module.css';
import { InstallCommand } from '@site/src/components/home/InstallCommand';
import { demos } from '@site/src/data/demos';
import recentPosts from '@generated/docusaurus-plugin-content-blog/default/recent-posts.js';

interface EngineModule {
  title: string;
  description: string;
  icon: ModuleIconName;
  to: string;
}

const engineModules: EngineModule[] = [
  {
    title: 'ECS',
    description: 'Entities, components and systems',
    icon: 'ecs',
    to: '/docs/docs/ecs',
  },
  {
    title: 'Rendering',
    description: 'WebGL2 sprites, cameras and nine-slice',
    icon: 'rendering',
    to: '/docs/docs/rendering',
  },
  {
    title: 'Post-processing',
    description: 'Bloom, blur and HDR',
    icon: 'postProcessing',
    to: '/docs/docs/rendering/bloom',
  },
  {
    title: 'Physics',
    description: 'Rigid bodies, joints and raycasts',
    icon: 'physics',
    to: '/docs/docs/physics',
  },
  {
    title: 'UI',
    description: 'Anchored layout, menus and controls',
    icon: 'ui',
    to: '/docs/docs/ui',
  },
  {
    title: 'Text',
    description: 'Sharp MSDF text at any size',
    icon: 'text',
    to: '/docs/docs/text',
  },
  {
    title: 'Input',
    description: 'Keyboard, mouse and gamepad',
    icon: 'input',
    to: '/docs/docs/input',
  },
  {
    title: 'Audio',
    description: 'Sounds and music through mixer buses',
    icon: 'audio',
    to: '/docs/docs/audio',
  },
  {
    title: 'Animations',
    description: 'Sprite sheets and easing',
    icon: 'animations',
    to: '/docs/docs/animations',
  },
  {
    title: 'Particles',
    description: 'Emitters, bursts and spawn shapes',
    icon: 'particles',
    to: '/docs/docs/particles',
  },
  {
    title: 'Transforms',
    description: 'Parent and child hierarchies',
    icon: 'transforms',
    to: '/docs/docs/common/transforms',
  },
  {
    title: 'Asset loading',
    description: 'Cached images and font atlases',
    icon: 'assetLoading',
    to: '/docs/docs/asset-loading',
  },
  {
    title: 'Game states',
    description: 'Menus, rounds and the switches between them',
    icon: 'states',
    to: '/docs/docs/states',
  },
  {
    title: 'State machines',
    description: 'States and the transitions between them',
    icon: 'stateMachines',
    to: '/docs/api/classes/FiniteStateMachine',
  },
  {
    title: 'Events',
    description: 'Decoupled game events',
    icon: 'events',
    to: '/docs/docs/events',
  },
  {
    title: 'Timers',
    description: 'Delayed and repeating callbacks',
    icon: 'timers',
    to: '/docs/docs/timer',
  },
  {
    title: 'Lifetimes',
    description: 'Entity expiry and removal',
    icon: 'lifetimes',
    to: '/docs/docs/lifecycle',
  },
  {
    title: 'Storage',
    description: 'Persistent state and storage backends',
    icon: 'storage',
    to: '/docs/docs/storage',
  },
  {
    title: 'Math',
    description: 'Vectors, matrices and seeded random',
    icon: 'math',
    to: '/docs/docs/math',
  },
  {
    title: 'Game loop',
    description: 'Frame timing and resizing',
    icon: 'gameLoop',
    to: '/docs/docs/ecs/game',
  },
];

const featuredDemoSlugs = ['car', 'space-shooter', 'text', 'physics'];

// Gameplay of Galactic Journey, a game built with Forge, as WebM (VP9) and
// MP4 (H.264): each browser plays the first format it supports.
const heroVideoPaths = {
  webm: '/videos/galactic-journey.webm',
  mp4: '/videos/galactic-journey.mp4',
};
const galacticJourneyUrl = 'https://galactic-journey-6517e.web.app';

const Hero = (): ReactNode => {
  const webmUrl = useBaseUrl(heroVideoPaths.webm);
  const mp4Url = useBaseUrl(heroVideoPaths.mp4);

  return (
    <header className={styles.hero}>
      <div className={styles.heroBackground} aria-hidden="true">
        <div className={clsx(styles.heroOrb, styles.heroOrbAmber)} />
        <div className={clsx(styles.heroOrb, styles.heroOrbTeal)} />
        <div className={clsx(styles.heroOrb, styles.heroOrbViolet)} />
      </div>
      <div className={styles.heroInner}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>Forge</h1>
          <p className={styles.heroIntro}>
            Build 2D games for the web in TypeScript. Built on an ECS core,
            rendered with WebGL2.
          </p>
          <div className={styles.heroActions}>
            <Link
              className="button button--primary button--lg"
              to="/docs/intro"
            >
              Get started
            </Link>
            <Link
              className={clsx(
                'button button--secondary button--lg',
                styles.heroSecondary,
              )}
              to="/demos"
            >
              Browse demos
            </Link>
          </div>
          <InstallCommand />
        </div>
        <figure className={styles.heroMedia}>
          <div className={styles.heroScreen}>
            <video
              className={styles.heroVideo}
              autoPlay
              loop
              muted
              playsInline
              aria-label="Gameplay of Galactic Journey, a game made with Forge"
            >
              <source src={webmUrl} type="video/webm" />
              <source src={mp4Url} type="video/mp4" />
            </video>
            <Link
              to={galacticJourneyUrl}
              className={styles.heroPlayLink}
              aria-label="Play Galactic Journey"
              title="Play Galactic Journey"
            >
              <svg
                className={styles.heroPlayIcon}
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M4.5 2.5v11L13.5 8z" />
              </svg>
            </Link>
          </div>
          <figcaption className={styles.heroCaption}>
            Galactic Journey | Forge
          </figcaption>
        </figure>
      </div>
    </header>
  );
};

const Modules = (): ReactNode => (
  <section className={styles.section}>
    <h2 className={styles.sectionTitle}>Everything you need</h2>
    <p className={styles.sectionIntro}>To build a great 2D game.</p>
    <div className={styles.moduleGrid}>
      {engineModules.map((engineModule) => (
        <Link
          key={engineModule.title}
          to={engineModule.to}
          className={styles.module}
        >
          <ModuleIcon name={engineModule.icon} />
          <div>
            <h3 className={styles.moduleTitle}>{engineModule.title}</h3>
            <p className={styles.moduleDescription}>
              {engineModule.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  </section>
);

const FeaturedDemos = (): ReactNode => {
  const featured = featuredDemoSlugs.map((slug) => {
    const demo = demos.find((candidate) => candidate.slug === slug);

    if (!demo) {
      throw new Error(`No demo with slug "${slug}" in src/data/demos.ts.`);
    }

    return demo;
  });

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Demos</h2>
      <p className={styles.sectionIntro}>
        Try features and games live in your browser.
      </p>
      <div className={styles.demoGrid}>
        {featured.map((demo) => (
          <DemoCard key={demo.slug} demo={demo} />
        ))}
      </div>
      <p className={styles.sectionFooter}>
        <Link to="/demos">All demos →</Link>
      </p>
    </section>
  );
};

const newsDateFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const News = (): ReactNode => (
  <section className={styles.section}>
    <h2 className={styles.sectionTitle}>News</h2>
    <div className={styles.newsGrid}>
      {recentPosts.map((post) => (
        <Link
          key={post.permalink}
          to={post.permalink}
          className={styles.newsPost}
        >
          {post.image && (
            <img className={styles.newsImage} src={post.image} alt="" />
          )}
          <div className={styles.newsBody}>
            <time className={styles.newsDate} dateTime={post.date}>
              {newsDateFormat.format(new Date(post.date))}
            </time>
            <h3 className={styles.newsTitle}>{post.title}</h3>
            <p className={styles.newsDescription}>{post.description}</p>
          </div>
        </Link>
      ))}
    </div>
    <p className={styles.sectionFooter}>
      <Link to="/blog">All posts →</Link>
    </p>
  </section>
);

export default function Home(): ReactNode {
  return (
    <Layout
      description="Forge is a TypeScript game engine for the browser: built on an ECS core and rendered with WebGL2."
      wrapperClassName="display-font"
    >
      <Hero />
      <main>
        <Modules />
        <News />
        <FeaturedDemos />
      </main>
    </Layout>
  );
}
