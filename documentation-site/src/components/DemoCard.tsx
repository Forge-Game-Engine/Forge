import React, { FC } from 'react';
import Link from '@docusaurus/Link';
import { Demo } from '@site/src/data/demos';
import { demoCategories } from '@site/src/data/demo-categories';
import styles from './_DemoCard.module.css';

interface DemoCardProps {
  demo: Demo;
  /**
   * The category page this card is being shown on, if any. Threaded through
   * to the demo's link as a `from` query param so the demo page can offer a
   * back button to the category the user came from.
   */
  fromCategorySlug?: string;
}

export const DemoCard: FC<DemoCardProps> = ({ demo, fromCategorySlug }) => {
  const categoryTitles = demo.categories.map(
    (categorySlug) =>
      demoCategories.find((category) => category.slug === categorySlug)
        ?.title ?? categorySlug,
  );

  const demoUrl = fromCategorySlug
    ? `/demos/${demo.slug}?from=${fromCategorySlug}`
    : `/demos/${demo.slug}`;

  return (
    <Link to={demoUrl} className={styles.card}>
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
