import { FC } from 'react';
import styles from './_CodeSelector.module.css';
import { CodeFile } from './_CodeSelector.types';
import { FileType, fileTypeIconLookup, groupByFileType } from './_CodeSelector.utils';
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
      {Object.entries(groupedFiles).map(([type, files]) => {
        const typeIcon = fileTypeIconLookup[type as FileType];

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
