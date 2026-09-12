import React, { FC } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { demoCategories } from '@site/src/data/demo-categories';
import { demos } from '@site/src/data/demos';
import { DemoCard } from '@site/src/components/DemoCard';
import styles from './_CategoryDemosPage.module.css';

interface CategoryDemosPageProps {
  categorySlug: string;
}

export const CategoryDemosPage: FC<CategoryDemosPageProps> = ({
  categorySlug,
}) => {
  const category = demoCategories.find(
    (candidate) => candidate.slug === categorySlug,
  );

  if (!category) {
    throw new Error(`Unknown demo category "${categorySlug}".`);
  }

  const categoryDemos = demos.filter((demo) =>
    demo.categories.includes(categorySlug),
  );

  return (
    <Layout
      title={`${category.title} Demos`}
      description={category.description}
    >
      <div className={styles.container}>
        <Link to="/demos" className={styles.back}>
          ← All categories
        </Link>
        <h1>{category.title}</h1>
        <p>{category.description}</p>
        <div className={styles.demoGrid}>
          {categoryDemos.map((demo) => (
            <DemoCard key={demo.slug} demo={demo} />
          ))}
        </div>
      </div>
    </Layout>
  );
};
