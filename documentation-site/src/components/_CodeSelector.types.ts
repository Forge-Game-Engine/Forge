export interface CodeFile {
  name: string;
  content: string;
}

export interface CodeSelectorProps {
  codeFiles: CodeFile[];
  selectedFileName?: string;
}
