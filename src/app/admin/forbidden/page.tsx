import Link from 'next/link';

export const metadata = { title: '403' };

export default function Forbidden() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <div>
        <div className="font-display text-8xl text-primary leading-none">403</div>
        <p className="text-muted mt-3 mb-6">Та энэ хуудсанд хандах эрхгүй байна.</p>
        <Link href="/admin" className="text-primary font-semibold">← Dashboard руу буцах</Link>
      </div>
    </div>
  );
}
