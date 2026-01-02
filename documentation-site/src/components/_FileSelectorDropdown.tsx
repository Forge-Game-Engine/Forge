import { FC } from 'react';
import styles from './_CodeSelector.module.css';
import { CodeFile } from './_CodeSelector.types';
import { FILE_TYPES, fileTypeIconLookup, groupByFileType } from './_CodeSelector.utils';
import { FileTypeGroup } from './_FileTypeGroup';

interface FileSelectorDropdownProps {
  codeFiles: CodeFile[];
  selectedFileName: string;
  onSelectFile: (file: CodeFile) => void;
}

export const FileSelectorDropdown: FC<FileSelectorDropdownProps> = ({
  codeFiles,
  selectedFileName,
  onSelectFile,
}) => {
  const groupedFiles = groupByFileType(codeFiles);

  return (
    <div className={styles.codeSelector}>
      {FILE_TYPES.map((type) => {
        const typeIcon = fileTypeIconLookup[type];
        const files = groupedFiles[type];

        if (files.length === 0) {
          return null;
        }

        return (
          <FileTypeGroup
            key={type}
            type={type}
            typeIcon={typeIcon}
            files={files}
            selectedFileName={selectedFileName}
            onSelectFile={onSelectFile}
          />
        );
      })}
    </div>
  );
};
