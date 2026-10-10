import React, { FC, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './DemoPanel.module.css';

interface DemoPanelProps {
  title: string;
  /** A Font Awesome solid icon name, such as `'fa-keyboard'`. */
  icon: string;
  children: ReactNode;
}

/**
 * A titled card in a demo page's sidebar. Use it for anything a demo shows
 * beside its game, such as live settings or a legend.
 */
export const DemoPanel: FC<DemoPanelProps> = ({ title, icon, children }) => {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>
        <i className={clsx('fa-solid', icon)} aria-hidden="true"></i> {title}
      </h2>
      {children}
    </section>
  );
};
