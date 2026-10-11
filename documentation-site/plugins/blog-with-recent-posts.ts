import path from 'node:path';
import blogPlugin from '@docusaurus/plugin-content-blog';
import type { LoadContext, Plugin } from '@docusaurus/types';
import type {
  BlogContent,
  BlogPost,
  PluginOptions,
} from '@docusaurus/plugin-content-blog';

export { validateOptions } from '@docusaurus/plugin-content-blog';

/** How many posts the homepage's news section lists. */
const recentPostCount = 3;

/**
 * Writes one post as a JS object literal. A banner `image` given relative to
 * the post (`./banner.png`) becomes a `require`, so webpack bundles it and
 * the object holds its URL.
 */
const toModuleEntry = ({ metadata }: BlogPost, siteDir: string): string => {
  const { image } = metadata.frontMatter;
  const postDir = path.dirname(metadata.source.replace(/^@site/, siteDir));
  const imageExpression =
    typeof image === 'string' && image.startsWith('.')
      ? `require(${JSON.stringify(path.resolve(postDir, image))}).default`
      : 'null';

  return `{
    title: ${JSON.stringify(metadata.title)},
    permalink: ${JSON.stringify(metadata.permalink)},
    date: ${JSON.stringify(new Date(metadata.date).toISOString())},
    description: ${JSON.stringify(metadata.description)},
    image: ${imageExpression},
  }`;
};

/**
 * The classic preset's blog plugin, plus a generated module listing the
 * newest posts, so pages outside the blog (the homepage) can link to them:
 * `@generated/docusaurus-plugin-content-blog/default/recent-posts.js`.
 */
export default async function blogWithRecentPosts(
  context: LoadContext,
  options: PluginOptions,
): Promise<Plugin<BlogContent>> {
  const blog = await blogPlugin(context, options);

  return {
    ...blog,
    contentLoaded: async (args) => {
      const entries = args.content.blogPosts
        .slice(0, recentPostCount)
        .map((post) => toModuleEntry(post, context.siteDir));

      await args.actions.createData(
        'recent-posts.js',
        `export default [${entries.join(',\n')}];\n`,
      );

      await blog.contentLoaded?.(args);
    },
  };
}
