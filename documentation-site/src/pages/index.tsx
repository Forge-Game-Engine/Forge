import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import { DemoCard } from '@site/src/components/DemoCard';
import {
  ModuleIcon,
  ModuleIconName,
} from '@site/src/components/home/ModuleIcon';
import styles from '@site/src/components/home/Home.module.css';
import { InstallCommand } from '@site/src/components/home/InstallCommand';
import { demos } from '@site/src/data/demos';

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

const Hero = (): ReactNode => {
  const videoUrl = useBaseUrl('/videos/Hero.mp4');

  return (
    <header className={styles.hero}>
      <video
        className={styles.heroVideo}
        src={videoUrl}
        autoPlay
        loop
        muted
        playsInline
      />
      <div className={styles.heroShade} />
      <div className={styles.heroInner}>
        <h1 className={styles.heroTitle}>Forge</h1>
        <p className={styles.heroIntro}>
          Build 2D games for the web in TypeScript. Code only, built on an ECS
          core, rendered with WebGL2.
        </p>
        <div className={styles.heroActions}>
          <Link className="button button--primary button--lg" to="/docs/intro">
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
    </header>
  );
};

const Modules = (): ReactNode => (
  <section className={styles.section}>
    <h2 className={styles.sectionTitle}>
      Everything you need to build a great 2D game
    </h2>
    <p className={styles.sectionIntro}>
      A complete toolbox, with minimal dependencies.
    </p>
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
        Try each feature live, with the code that runs it right beside it.
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

export default function Home(): ReactNode {
  return (
    <Layout
      title="Browser game engine"
      description="Forge is a TypeScript game engine for the browser: code only, built on an ECS core and rendered with WebGL2."
    >
      <Hero />
      <main>
        <Modules />
        <FeaturedDemos />
      </main>
    </Layout>
  );
}
