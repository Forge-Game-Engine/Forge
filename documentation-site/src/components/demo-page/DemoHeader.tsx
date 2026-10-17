import React, { FC } from 'react';
import Link from '@docusaurus/Link';
import { useDemoBackLink } from '@site/src/hooks/useDemoBackLink';
import styles from './DemoHeader.module.css';
import { DemoDocLink } from './types';

interface DemoHeaderProps {
  title: string;
  summary: string;
  docLinks: DemoDocLink[];
}

/**
 * A demo page's back link, title, one-line summary and links to the docs.
 */
export const DemoHeader: FC<DemoHeaderProps> = ({
  title,
  summary,
  docLinks,
}) => {
  const backLink = useDemoBackLink();

  return (
    <>
      <Link to={backLink.to} className={styles.back}>
        {backLink.label}
      </Link>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.summary}>{summary}</p>
        {docLinks.length > 0 && (
          <nav className={styles.docLinks} aria-label="Related docs">
            <span>
              <i className="fa-solid fa-book" aria-hidden="true"></i> Docs:
            </span>
            {docLinks.map((docLink) => (
              <Link key={docLink.to} to={docLink.to}>
                {docLink.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  );
};
