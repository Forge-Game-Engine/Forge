import React, { JSX, useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import { demoCategories } from '@site/src/data/demo-categories';
import { demos } from '@site/src/data/demos';
import { DemoCategoryCard } from '@site/src/components/DemoCategoryCard';
import { DemoCard } from '@site/src/components/DemoCard';
import { DemoSearch } from '@site/src/components/DemoSearch';
import styles from './_index.module.css';

export default function Demos(): JSX.Element {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim().toLowerCase();

  const matchingDemos = useMemo(
    () =>
      trimmedQuery.length === 0
        ? []
        : demos.filter((demo) =>
            demo.title.toLowerCase().includes(trimmedQuery),
          ),
    [trimmedQuery],
  );

  return (
    <Layout
      title="Demos"
      description="Interactive demos of the Forge Game Engine's features, sorted by category."
    >
      <div className={styles.container}>
        <p className="eyebrow">See it running</p>
        <h1>Demos</h1>
        <p className={styles.intro}>
          Try each feature live, with the code that runs it right beside it.
          Browse by category, or search by title.
        </p>
        <DemoSearch value={query} onChange={setQuery} />
        {trimmedQuery.length === 0 ? (
          <div className={styles.categoryGrid}>
            {demoCategories.map((category) => (
              <DemoCategoryCard key={category.slug} category={category} />
            ))}
          </div>
        ) : (
          <div className={styles.demoGrid}>
            {matchingDemos.length === 0 ? (
              <p>No demos found for &ldquo;{query}&rdquo;.</p>
            ) : (
              matchingDemos.map((demo) => (
                <DemoCard key={demo.slug} demo={demo} />
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
