import type { BlogPostData } from './blogPost';
import { post as post1 } from './blogPosts/post-1';

/** Wszystkie wpisy bloga, posortowane od najnowszego. */
export const blogPosts: BlogPostData[] = [post1].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);

/** Zwraca wpis po slugu lub undefined. */
export function getPostBySlug(slug: string): BlogPostData | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
