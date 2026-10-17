import React, { FC } from 'react';
import Link from '@docusaurus/Link';
import { DemoCategory } from '@site/src/data/demo-categories';
import { demos } from '@site/src/data/demos';
import { ModuleIcon } from './ModuleIcon';
import styles from './_DemoCategoryCard.module.css';

interface DemoCategoryCardProps {
  category: DemoCategory;
}

export const DemoCategoryCard: FC<DemoCategoryCardProps> = ({ category }) => {
  const demoCount = demos.filter((demo) =>
    demo.categories.includes(category.slug),
  ).length;

  return (
    <Link to={`/demos/category/${category.slug}`} className={styles.card}>
      <div className={styles.top}>
        <span className={styles.iconTile}>
          <ModuleIcon name={category.icon} className={styles.icon} />
        </span>
        <span className={styles.count}>
          {demoCount} {demoCount === 1 ? 'demo' : 'demos'}
        </span>
      </div>
      <h3 className={styles.title}>{category.title}</h3>
      <p className={styles.description}>{category.description}</p>
    </Link>
  );
};
