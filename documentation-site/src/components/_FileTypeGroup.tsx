import { FC } from 'react';
import clsx from 'clsx';
import styles from './_CodeSelector.module.css';
import { CodeFile } from './_CodeSelector.types';

interface FileTypeGroupProps {
  type: string;
  typeIcon: string;
  files: CodeFile[];
  selectedFileName: string;
  onSelectFile: (file: CodeFile) => void;
}

export const FileTypeGroup: FC<FileTypeGroupProps> = ({
  type,
  typeIcon,
  files,
  selectedFileName,
  onSelectFile,
}) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={styles.fileTypeGroup}>
      <i className={clsx('fa-solid', typeIcon, styles.fileIcon)}></i>
      {type}
      {files.map((file) => {
        return (
          <button
            key={file.name}
            className={clsx(
              file.name === selectedFileName
                ? styles.selectedFile
                : undefined,
            )}
            onClick={() => onSelectFile(file)}
          >
            <span className={styles.fileButtonName}>{file.name}</span>
          </button>
        );
      })}
    </div>
  );
};
