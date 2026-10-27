import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-bg text-ink px-4">
      <div className="text-center">
        <div className="font-display text-7xl text-primary">404</div>
        <p className="text-muted mt-3 mb-6">Хуудас олдсонгүй.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-primary hover:opacity-90">
          <span className="material-icons-round text-lg">home</span> Нүүр хуудас
        </Link>
      </div>
    </div>
  );
}
