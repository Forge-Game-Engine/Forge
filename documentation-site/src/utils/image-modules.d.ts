// Docusaurus's webpack config emits imported images as files and gives the
// importing module their URL.
declare module '*.png' {
  const url: string;
  export default url;
}
