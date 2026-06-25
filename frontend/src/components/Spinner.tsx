/** Prosty spinner ładowania. */
export default function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-brand-600 ${className}`}
      role="status"
      aria-label="Ładowanie"
    />
  );
}
