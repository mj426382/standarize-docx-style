import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';

/** Strona listy wpisów bloga. */
export default function Blog() {
  return (
    <>
      <Helmet>
        <title>Blog — DokFormat</title>
        <meta
          name="description"
          content="Porady o formatowaniu dokumentów Word, spójności stylów, typografii i automatyzacji składu."
        />
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="mt-3 text-gray-500">
          Wiedza o formatowaniu, typografii i automatyzacji dokumentów.
        </p>

        <div className="mt-12 space-y-6">
          {blogPosts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="block rounded-2xl border border-gray-100 p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
                  {post.category}
                </span>
                <span>{new Date(post.publishedAt).toLocaleDateString('pl-PL')}</span>
                <span>· {post.readTime} min czytania</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold">{post.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
