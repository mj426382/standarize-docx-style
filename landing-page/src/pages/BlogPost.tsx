import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getPostBySlug } from '../data/blogPosts';

/** Strona pojedynczego wpisu bloga z renderem Markdown i SEO. */
export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-gray-500">Nie znaleziono wpisu.</p>
        <Link to="/blog" className="mt-4 inline-block text-brand-600 hover:underline">
          ← Wróć do bloga
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.title} — DokFormat</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
      </Helmet>

      <article className="mx-auto max-w-3xl px-4 py-16">
        <Link to="/blog" className="text-sm text-brand-600 hover:underline">
          ← Wróć do bloga
        </Link>
        <div className="mt-6 flex items-center gap-3 text-xs text-gray-400">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
            {post.category}
          </span>
          <span>{new Date(post.publishedAt).toLocaleDateString('pl-PL')}</span>
          <span>· {post.readTime} min czytania</span>
        </div>
        <div className="markdown mt-6">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </article>
    </>
  );
}
