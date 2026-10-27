'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';

const INP =
  'w-full bg-[#0f1117] border border-[#2a2f3d] text-[#e2e8f0] px-3.5 py-[11px] rounded-lg text-[15px] outline-none transition-colors focus:border-[#E8601C] focus:ring-[3px] focus:ring-[#E8601C]/15';

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: '', email: '' });
  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      {state.error && (
        <div className="bg-[rgba(231,76,60,.1)] border border-[rgba(231,76,60,.25)] text-[#f0a8a8] px-3.5 py-2.5 rounded-lg text-[13px] mb-4">⚠️ {state.error}</div>
      )}
      <div className="mb-4">
        <label className="block text-[11px] font-bold uppercase tracking-[1px] text-[#8892a4] mb-1.5">И-мэйл</label>
        <input type="email" name="email" defaultValue={state.email} placeholder="name@email.com" required autoFocus autoComplete="username" className={INP} />
      </div>
      <div className="mb-4">
        <label className="block text-[11px] font-bold uppercase tracking-[1px] text-[#8892a4] mb-1.5">Нууц үг</label>
        <input type="password" name="password" placeholder="••••••••" required autoComplete="current-password" className={INP} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#E8601C] hover:bg-[#c44e14] text-white py-[13px] rounded-lg font-display text-lg font-bold mt-1 transition-colors disabled:opacity-60"
      >
        {pending ? 'Шалгаж байна...' : 'Нэвтрэх →'}
      </button>
    </form>
  );
}
