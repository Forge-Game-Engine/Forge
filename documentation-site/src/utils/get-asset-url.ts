// A plain `require(`@site/static/${fileName}`)` would make the bundler's
// context cover every file under static/ (recursively), including non-asset
// files like vendor pack .txt/.xml files, which it then fails to parse as JS.
// require.context's regExp argument is a real (statically analyzable)
// parameter rather than a magic comment, so it actually restricts the
// context to asset files.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
const assetContext = require.context(
  '@site/static',
  true,
  /\.(png|jpe?g|gif|svg|webp|mp3|wav|ogg)$/i,
);

export const getAssetUrl = (fileName: string): string => {
  return (assetContext(`./${fileName}`) as { default: string }).default;
};
