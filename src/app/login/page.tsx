import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { Logo } from '@/components/public/lmn';
import ThemeToggle from '@/components/public/ThemeToggle';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Нэвтрэх', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getUser()) redirect('/admin');
  const { next = '/admin' } = await searchParams;

  return (
    <div className="lmn-site min-h-screen bg-bg text-ink flex flex-col">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex-1 grid place-items-center px-4 pb-16">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-7">
            <Logo />
            <p className="text-sm text-muted mt-2">Лигийн удирдлагын систем</p>
          </div>
          <div className="bg-surface border border-line rounded-2xl p-7">
            <h1 className="font-display text-[22px] font-semibold uppercase tracking-wide mb-5 flex items-center gap-2 before:w-1 before:h-5 before:rounded before:bg-primary">
              Нэвтрэх
            </h1>
            <LoginForm next={next} />
          </div>
          <div className="text-center mt-5 text-xs text-muted">© {new Date().getFullYear()} LeagueMN</div>
        </div>
      </div>
    </div>
  );
}
