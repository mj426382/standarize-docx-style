/** Struktura pojedynczego wpisu na blogu. */
export interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** Treść w formacie Markdown. */
  content: string;
  publishedAt: string;
  readTime: number;
  category: string;
}
