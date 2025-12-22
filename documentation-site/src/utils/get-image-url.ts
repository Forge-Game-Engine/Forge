export const getImageUrl = (fileName: string): string => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
  return require(`@site/static/img/${fileName}`).default as string;
};
