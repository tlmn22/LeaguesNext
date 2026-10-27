'use client';

import { useRouter } from 'next/navigation';

export default function BackLink({ label = 'Буцах' }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
      className="inline-flex items-center gap-2 text-sm font-medium text-ink2 hover:text-primary transition-colors"
    >
      <span className="material-icons-round text-lg">arrow_back</span> {label}
    </button>
  );
}
