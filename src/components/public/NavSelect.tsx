'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/** Сонголт өөрчлөгдөхөд `hrefTemplate`-ийн {v}-г солиод шилжинэ */
export function NavSelect({
  value,
  hrefTemplate,
  className,
  children,
}: {
  value: string | number;
  hrefTemplate: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <select
      value={String(value)}
      onChange={(e) => router.push(hrefTemplate.replace('{v}', encodeURIComponent(e.target.value)))}
      className={className}
    >
      {children}
    </select>
  );
}

export function NavDateInput({ value, hrefTemplate, className }: { value: string; hrefTemplate: string; className?: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      defaultValue={value}
      onChange={(e) => e.target.value && router.push(hrefTemplate.replace('{v}', e.target.value))}
      className={className}
    />
  );
}
