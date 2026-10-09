import React, { FC } from 'react';
import styles from './DemoLegend.module.css';
import { DemoLegendItem } from './types';

interface DemoLegendProps {
  items: DemoLegendItem[];
}

/**
 * A key to what the markers in a demo's scene mean, such as the color of
 * each row. Put it in a {@link DemoPanel}.
 */
export const DemoLegend: FC<DemoLegendProps> = ({ items }) => {
  return (
    <ul className={styles.legend}>
      {items.map((item) => (
        <li key={item.label} className={styles.item}>
          <span className={styles.marker}>{item.marker}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
};
