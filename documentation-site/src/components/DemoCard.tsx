import React, { FC } from 'react';
import Link from '@docusaurus/Link';
import { Demo } from '@site/src/data/demos';
import { demoCategories } from '@site/src/data/demo-categories';
import styles from './_DemoCard.module.css';

interface DemoCardProps {
  demo: Demo;
}

export const DemoCard: FC<DemoCardProps> = ({ demo }) => {
  const categoryTitles = demo.categories.map(
    (categorySlug) =>
      demoCategories.find((category) => category.slug === categorySlug)
        ?.title ?? categorySlug,
  );

  return (
    <Link to={`/demos/${demo.slug}`} className={styles.card}>
      <h3 className={styles.title}>{demo.title}</h3>
      <p className={styles.description}>{demo.description}</p>
      <div className={styles.tags}>
        {categoryTitles.map((title) => (
          <span key={title} className={styles.tag}>
            {title}
          </span>
        ))}
      </div>
    </Link>
  );
};
