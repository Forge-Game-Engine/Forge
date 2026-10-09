import React, { FC, useState } from 'react';
import CodeBlock from '@theme/CodeBlock';
import clsx from 'clsx';
import { cleanCodeSnippet } from '@site/src/utils/clean-code-snippet';
import styles from './DemoPage.module.css';
import {
  DemoFileType,
  demoFileTypeOrder,
  demoFileTypes,
  getDemoFileType,
} from './file-types';
import { DemoFile, DemoFileGroup } from './types';

interface CodeExplorerProps {
  fileGroups: DemoFileGroup[];
  selectedFile: DemoFile;
  onSelectFile: (fileName: string) => void;
}

const FileTypeIcon: FC<{ type: DemoFileType }> = ({ type }) => (
  <i
    className={clsx(
      'fa-solid',
      demoFileTypes[type].icon,
      styles.fileIcon,
      styles[`fileType_${type}`],
    )}
    aria-hidden="true"
  ></i>
);

export const CodeExplorer: FC<CodeExplorerProps> = ({
  fileGroups,
  selectedFile,
  onSelectFile,
}) => {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DemoFileType | 'all'>('all');

  const allFiles = fileGroups.flatMap((group) => group.files);
  const typesPresent = demoFileTypeOrder.filter((type) =>
    allFiles.some((file) => getDemoFileType(file.name) === type),
  );
  const normalizedQuery = query.trim().toLowerCase();

  const matches = (file: DemoFile): boolean =>
    (typeFilter === 'all' || getDemoFileType(file.name) === typeFilter) &&
    file.name.toLowerCase().includes(normalizedQuery);

  const visibleGroups = fileGroups
    .map((group) => ({ ...group, files: group.files.filter(matches) }))
    .filter((group) => group.files.length > 0);

  const selectedType = getDemoFileType(selectedFile.name);

  const filterOptions: { value: DemoFileType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    ...typesPresent.map((type) => ({
      value: type,
      label: demoFileTypes[type].pluralLabel,
    })),
  ];

  return (
    <div className={styles.explorer}>
      <div className={styles.fileBrowser}>
        <div className={styles.fileFilters}>
          <div className={styles.fileSearch}>
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input
              type="search"
              placeholder="Search files"
              aria-label="Search files by name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div
            className={styles.typeFilter}
            role="group"
            aria-label="Filter files by type"
          >
            {filterOptions.map(({ value, label }) => {
              const count =
                value === 'all'
                  ? allFiles.length
                  : allFiles.filter(
                      (file) => getDemoFileType(file.name) === value,
                    ).length;

              return (
                <button
                  key={value}
                  type="button"
                  className={clsx(
                    styles.typeFilterButton,
                    typeFilter === value && styles.typeFilterButtonSelected,
                  )}
                  aria-pressed={typeFilter === value}
                  onClick={() => setTypeFilter(value)}
                >
                  {value !== 'all' && <FileTypeIcon type={value} />}
                  {label}
                  <span className={styles.typeFilterCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <nav className={styles.fileTree} aria-label="Source files">
          {visibleGroups.length === 0 && (
            <p className={styles.noFiles}>No files match.</p>
          )}
          {visibleGroups.map((group) => (
            <div key={group.title} className={styles.fileGroup}>
              <div className={styles.fileGroupTitle}>{group.title}</div>
              <ul>
                {group.files.map((file) => {
                  const isSelected = file.name === selectedFile.name;
                  const type = getDemoFileType(file.name);

                  return (
                    <li key={file.name}>
                      <button
                        type="button"
                        className={clsx(
                          styles.fileButton,
                          isSelected && styles.fileButtonSelected,
                        )}
                        aria-current={isSelected ? 'true' : undefined}
                        title={`${file.name} (${demoFileTypes[type].label})`}
                        onClick={() => onSelectFile(file.name)}
                      >
                        <FileTypeIcon type={type} />
                        <span className={styles.fileName}>{file.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={styles.filePane}>
        <div className={styles.filePaneHeader}>
          <div className={styles.filePaneTitle}>
            <span className={styles.filePaneName}>{selectedFile.name}</span>
            <span
              className={clsx(
                styles.typeBadge,
                styles[`fileType_${selectedType}`],
              )}
            >
              <FileTypeIcon type={selectedType} />
              {demoFileTypes[selectedType].label}
            </span>
          </div>
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
