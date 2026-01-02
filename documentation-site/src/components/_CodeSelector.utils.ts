/* eslint-disable @typescript-eslint/naming-convention */
import { CodeFile } from './_CodeSelector.types';

export type FileType = 'Game' | 'Components' | 'Systems' | 'Shaders' | 'Others';

export const fileTypeIconLookup: Record<FileType, string> = {
  Components: 'fa-cube',
  Systems: 'fa-gears',
  Game: 'fa-earth-africa',
  Shaders: 'fa-palette',
  Others: 'fa-code',
};

export const FILE_TYPES: readonly FileType[] = [
  'Game',
  'Components',
  'Systems',
  'Shaders',
  'Others',
];

export const getFileTypeIcon = (fileName: string): FileType => {
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

export const groupByFileType = (
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
    acc[fileType].push(file);

    return acc;
  }, record);

  return groups;
};
