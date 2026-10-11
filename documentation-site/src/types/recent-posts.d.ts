declare module '@generated/docusaurus-plugin-content-blog/default/recent-posts.js' {
  /** A blog post as the homepage's news section reads it. */
  export interface RecentBlogPost {
    title: string;
    permalink: string;
    /** The publish date, as an ISO 8601 string. */
    date: string;
    description: string;
    /** The bundled URL of the post's banner image, if it has one. */
    image: string | null;
  }

  /** The newest blog posts, newest first. */
  const recentPosts: RecentBlogPost[];
  export default recentPosts;
}
