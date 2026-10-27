import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Нэвтрэх', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getUser()) redirect('/admin');
  const { next = '/admin' } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative" style={{ background: '#0f1117', color: '#e2e8f0' }}>
      <div className="fixed pointer-events-none leading-none" style={{ fontSize: 500, opacity: 0.025, top: -80, right: -100 }} aria-hidden="true">
        🏀
      </div>
      <div className="w-full max-w-[400px] p-5 relative z-[1]">
        <div className="text-center mb-8">
          <h1 className="font-display text-[40px] font-bold text-white">
            🏀 <em className="not-italic text-[#E8601C]">League</em>Manager
          </h1>
          <p className="text-[13px] text-[#8892a4] mt-1">Сагсан бөмбөгийн лигийн удирдлагын систем</p>
        </div>
        <div className="rounded-[14px] p-[34px]" style={{ background: '#181c26', border: '1px solid #2a2f3d' }}>
          <h2 className="font-display text-[22px] font-bold mb-[22px]">Нэвтрэх</h2>
          <LoginForm next={next} />
        </div>
        <div className="text-center mt-4 text-xs text-[#8892a4]">© {new Date().getFullYear()} LeagueMN</div>
      </div>
    </div>
  );
}
