import { FC, useState } from 'react';
import CodeBlock from '@theme/CodeBlock';
import { cleanCodeSnippet } from '../utils/clean-code-snippet';
import styles from './_CodeSelector.module.css';

export interface CodeFile {
  name: string;
  content: string;
}

export interface CodeSelectorProps {
  codeFiles: CodeFile[];
  selectedFileName?: string;
}

export const CodeSelector: FC<CodeSelectorProps> = ({
  codeFiles,
  selectedFileName,
}) => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(
    codeFiles.find((file) => file.name === selectedFileName) || codeFiles[0],
  );

  return (
    <div className={styles.container}>
      <div className={styles.codeSelector}>
        {codeFiles.map((file) => (
          <button
            key={file.name}
            className={file === selectedFile ? styles.selected : ''}
            onClick={() => setSelectedFile(file)}
          >
            {file.name}
          </button>
        ))}
      </div>
      <CodeBlock language="typescript" className={styles.codeBlock}>
        {cleanCodeSnippet(selectedFile.content)}
      </CodeBlock>
    </div>
  );
};
