import React, { FC } from 'react';
import styles from './DemoHighlights.module.css';
import { DemoHighlight } from './types';

interface DemoHighlightsProps {
  highlights: DemoHighlight[];
  onOpenFile: (fileName: string) => void;
}

/**
 * The "How it works" list: a few short points, each with a link that opens
 * the file implementing it in the code explorer.
 */
export const DemoHighlights: FC<DemoHighlightsProps> = ({
  highlights,
  onOpenFile,
}) => {
  return (
    <ul className={styles.highlights}>
      {highlights.map(({ text, file }, index) => (
        <li key={index}>
          {text}
          {file && (
            <button
              type="button"
              className={styles.fileLink}
              onClick={() => onOpenFile(file)}
            >
              <i className="fa-solid fa-code" aria-hidden="true"></i> {file}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};
