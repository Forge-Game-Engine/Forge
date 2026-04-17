/* eslint-disable @typescript-eslint/naming-convention */
import { FC, useState } from 'react';
import CodeBlock from '@theme/CodeBlock';
import { cleanCodeSnippet } from '../utils/clean-code-snippet';
import styles from './_CodeSelector.module.css';
import { CodeFile, CodeSelectorProps } from './_CodeSelector.types';
import { fileTypeIconLookup, getFileTypeIcon } from './_CodeSelector.utils';
import { FileToolbar } from './_FileToolbar';
import { FileSelectorDropdown } from './_FileSelectorDropdown';

export type { CodeFile, CodeSelectorProps };

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

  const handleSelectFile = (file: CodeFile): void => {
    setSelectedFile(file);
    setSelectingFile(false);
  };

  const toggleSelector = (): void => {
    setSelectingFile(!selectingFile);
  };

  return (
    <div className={styles.container}>
      <FileToolbar
        fileName={selectedFile.name}
        fileTypeIcon={fileTypeIcon}
        onToggleSelector={toggleSelector}
        numberOfFiles={codeFiles.length}
      />
      {selectingFile ? (
        <FileSelectorDropdown
          codeFiles={codeFiles}
          selectedFileName={selectedFile.name}
          onSelectFile={handleSelectFile}
        />
      ) : (
        <CodeBlock
          language="typescript"
          className={styles.codeBlock}
          showLineNumbers
        >
          {cleanCodeSnippet(selectedFile.content)}
        </CodeBlock>
      )}
    </div>
  );
};
