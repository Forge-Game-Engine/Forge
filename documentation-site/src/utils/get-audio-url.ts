export const getAudioUrl = (fileName: string): string => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
  return require(`@site/static/audio/${fileName}`).default as string;
};
