export const getAssetUrl = (fileName: string): string => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
  return require(`@site/static/${fileName}`).default as string;
};
