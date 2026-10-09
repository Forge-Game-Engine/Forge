import React, { FC } from 'react';
import CodeBlock from '@theme/CodeBlock';
import clsx from 'clsx';
import { cleanCodeSnippet } from '@site/src/utils/clean-code-snippet';
import {
  fileTypeIconLookup,
  getFileTypeIcon,
} from '@site/src/components/_CodeSelector.utils';
import styles from './DemoPage.module.css';
import { DemoFile, DemoFileGroup } from './types';

interface CodeExplorerProps {
  fileGroups: DemoFileGroup[];
  selectedFile: DemoFile;
  onSelectFile: (fileName: string) => void;
}

export const CodeExplorer: FC<CodeExplorerProps> = ({
  fileGroups,
  selectedFile,
  onSelectFile,
}) => {
  return (
    <div className={styles.explorer}>
      <nav className={styles.fileTree} aria-label="Source files">
        {fileGroups.map((group) => (
          <div key={group.title} className={styles.fileGroup}>
            <div className={styles.fileGroupTitle}>{group.title}</div>
            <ul>
              {group.files.map((file) => {
                const isSelected = file.name === selectedFile.name;

                return (
                  <li key={file.name}>
                    <button
                      type="button"
                      className={clsx(
                        styles.fileButton,
                        isSelected && styles.fileButtonSelected,
                      )}
                      aria-current={isSelected ? 'true' : undefined}
                      title={file.name}
                      onClick={() => onSelectFile(file.name)}
                    >
                      <i
                        className={clsx(
                          'fa-solid',
                          fileTypeIconLookup[getFileTypeIcon(file.name)],
                          styles.fileIcon,
                        )}
                      ></i>
                      <span className={styles.fileName}>{file.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.filePane}>
        <div className={styles.filePaneHeader}>
          <span className={styles.filePaneName}>{selectedFile.name}</span>
          <span className={styles.filePaneSummary}>{selectedFile.summary}</span>
        </div>
        <CodeBlock
          language="typescript"
          className={styles.codeBlock}
          showLineNumbers
        >
          {cleanCodeSnippet(selectedFile.content)}
        </CodeBlock>
      </div>
    </div>
  );
};
