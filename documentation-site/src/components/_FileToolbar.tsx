import { FC } from 'react';
import clsx from 'clsx';
import styles from './_CodeSelector.module.css';

interface FileToolbarProps {
  fileName: string;
  fileTypeIcon: string;
  onToggleSelector: () => void;
  numberOfFiles: number;
}

export const FileToolbar: FC<FileToolbarProps> = ({
  fileName,
  fileTypeIcon,
  onToggleSelector,
  numberOfFiles,
}) => {
  return (
    <div className={styles.fileNameToolbar}>
      <i className={clsx('fa-solid', fileTypeIcon, styles.fileTypeIcon)}></i>
      <span className={styles.fileName}>{fileName}</span>
      <button onClick={onToggleSelector}>
        {numberOfFiles} file(s){' '}
        <i className={clsx('fa-solid fa-folder', styles.folder)}></i>
      </button>
    </div>
  );
};
