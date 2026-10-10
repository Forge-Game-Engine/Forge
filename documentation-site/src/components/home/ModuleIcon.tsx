import React, { FC, ReactNode } from 'react';
import styles from './Home.module.css';

/**
 * Line icons for the engine's modules: teal strokes (`currentColor`) with
 * one amber accent each, drawn on a 24x24 grid.
 */
const icons = {
  ecs: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        className={styles.accent}
      />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  rendering: (
    <>
      <path d="M12 3 21 20H3Z" />
      <path d="M12 3v17M7.6 12h8.8" />
    </>
  ),
  postProcessing: (
    <>
      <circle cx="12" cy="12" r="3.5" className={styles.accent} />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </>
  ),
  physics: (
    <>
      <circle cx="15" cy="10" r="4.5" />
      <path d="M3 7h5M3 10h5M3 13h5M3 20h18" />
    </>
  ),
  ui: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M7 15h10" />
      <circle cx="12" cy="15" r="2" className={styles.accent} />
    </>
  ),
  text: <path d="M5 20 12 4l7 16M8 14h8" />,
  input: (
    <>
      <rect x="2" y="7" width="20" height="11" rx="5.5" />
      <path d="M7 10.5v4M5 12.5h4" />
      <circle cx="16" cy="11" r="1.3" className={styles.accent} />
      <circle cx="18.2" cy="14" r="1.3" className={styles.accent} />
    </>
  ),
  audio: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4Z" />
      <path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  animations: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M9 5v14M15 5v14" />
      <circle cx="6" cy="14" r="1.4" className={styles.accent} />
      <circle cx="12" cy="11" r="1.4" className={styles.accent} />
      <circle cx="18" cy="9" r="1.4" className={styles.accent} />
    </>
  ),
  particles: (
    <>
      <circle cx="12" cy="12" r="2.6" className={styles.accent} />
      <circle cx="5" cy="7" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="19" cy="7" r="1.5" />
      <circle cx="5" cy="17" r="1.5" />
      <circle cx="12" cy="20" r="1.5" />
      <circle cx="19" cy="17" r="1.5" />
    </>
  ),
  transforms: (
    <>
      <circle cx="12" cy="5" r="2.2" className={styles.accent} />
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="19" r="2.2" />
      <path d="M11 7 7 17M13 7l4 10" />
    </>
  ),
  assetLoading: <path d="M12 4v11M7 10l5 5 5-5M4 17v3h16v-3" />,
  states: (
    <>
      <circle cx="5" cy="12" r="2.8" />
      <circle cx="12" cy="12" r="2.8" className={styles.accent} />
      <circle cx="19" cy="12" r="2.8" />
    </>
  ),
  events: <path d="M13 2 4 14h7l-1 8 10-13h-7Z" />,
  timers: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V9M10 2h4M18 6l1.5-1.5" />
      <circle cx="12" cy="13" r="1.3" className={styles.accent} />
    </>
  ),
  gameLoop: <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" />,
} satisfies Record<string, ReactNode>;

export type ModuleIconName = keyof typeof icons;

export const ModuleIcon: FC<{ name: ModuleIconName }> = ({ name }) => (
  <svg
    className={styles.icon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {icons[name]}
  </svg>
);
