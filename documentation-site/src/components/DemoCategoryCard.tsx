import React, { FC } from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { DemoCategory } from '@site/src/data/demo-categories';
import styles from './_DemoCategoryCard.module.css';

interface DemoCategoryCardProps {
  category: DemoCategory;
}

export const DemoCategoryCard: FC<DemoCategoryCardProps> = ({ category }) => {
  const imageUrl = useBaseUrl(category.image);

  return (
    <Link to={`/demos/category/${category.slug}`} className={styles.card}>
      <img src={imageUrl} alt="" className={styles.image} />
      <div className={styles.body}>
        <h3 className={styles.title}>{category.title}</h3>
        <p className={styles.description}>{category.description}</p>
      </div>
    </Link>
  );
};
