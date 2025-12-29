/* eslint-disable @typescript-eslint/naming-convention */
import { FC, useState } from 'react';
import CodeBlock from '@theme/CodeBlock';
import { cleanCodeSnippet } from '../utils/clean-code-snippet';
import styles from './_CodeSelector.module.css';
import clsx from 'clsx';

export interface CodeFile {
  name: string;
  content: string;
}

export interface CodeSelectorProps {
  codeFiles: CodeFile[];
  selectedFileName?: string;
}

type FileType = 'Game' | 'Components' | 'Systems' | 'Shaders' | 'Others';

const fileTypeIconLookup: Record<FileType, string> = {
  Components: 'fa-cube',
  Systems: 'fa-gears',
  Game: 'fa-earth-africa',
  Shaders: 'fa-palette',
  Others: 'fa-code',
};

const getFileTypeIcon = (fileName: string): FileType => {
  if (fileName.includes('.component')) {
    return 'Components';
  }

  if (fileName.includes('.system')) {
    return 'Systems';
  }

  if (fileName.includes('game')) {
    return 'Game';
  }

  if (fileName.includes('.shader')) {
    return 'Shaders';
  }

  return 'Others';
};

const groupByFileType = (
  codeFiles: CodeFile[],
): Record<FileType, CodeFile[]> => {
  const record = {
    Game: [],
    Components: [],
    Systems: [],
    Shaders: [],
    Others: [],
  } as Record<FileType, CodeFile[]>;

  const groups = codeFiles.reduce((acc, file) => {
    const fileType = getFileTypeIcon(file.name);

    if (!acc[fileType]) {
      acc[fileType] = [];
    }

    acc[fileType].push(file);

    return acc;
  }, record);

  return groups;
};

export const CodeSelector: FC<CodeSelectorProps> = ({
  codeFiles,
  selectedFileName,
}) => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(
    codeFiles.find((file) => file.name === selectedFileName) || codeFiles[0],
  );

  const [selectingFile, setSelectingFile] = useState<boolean>(false);

  const fileType = getFileTypeIcon(selectedFile.name);
  const fileTypeIcon = fileTypeIconLookup[fileType];
  const groupedFiles = groupByFileType(codeFiles);

  return (
    <div className={styles.container}>
      <div className={styles.fileNameToolbar}>
        <i className={clsx('fa-solid', fileTypeIcon, styles.fileTypeIcon)}></i>
        <span className={styles.fileName}>{selectedFile.name}</span>
        <button onClick={() => setSelectingFile(!selectingFile)}>
          <i className={clsx('fa-solid fa-folder', styles.folder)}></i>
        </button>
      </div>
      {selectingFile && (
        <div className={styles.codeSelector}>
          {Object.entries(groupedFiles).map(([type, files]) => {
            const typeIcon = fileTypeIconLookup[type as FileType];

            if (files.length === 0) {
              return null;
            }

            return (
              <div key={type} className={styles.fileTypeGroup}>
                <i className={clsx('fa-solid', typeIcon, styles.fileIcon)}></i>
                {type}
                {files.map((file) => {
                  return (
                    <button
                      key={file.name}
                      className={clsx(
                        file.name === selectedFile.name
                          ? styles.selectedFile
                          : undefined,
                      )}
                      onClick={() => {
                        setSelectedFile(file);
                        setSelectingFile(false);
                      }}
                    >
                      <span className={styles.fileButtonName}>{file.name}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
      <CodeBlock language="typescript" className={styles.codeBlock}>
        {cleanCodeSnippet(selectedFile.content)}
      </CodeBlock>
    </div>
  );
};
