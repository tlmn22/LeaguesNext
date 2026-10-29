'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';

const INP =
  'w-full h-11 bg-surface border border-line2 text-ink px-3.5 rounded-xl text-[15px] placeholder:text-muted outline-none transition-colors focus:border-primary focus:ring-[3px] focus:ring-primary/15';
const LBL = 'block text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted mb-1.5';

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: '', email: '' });
  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      {state.error && (
        <div className="bg-live/10 border border-live/30 text-live px-3.5 py-2.5 rounded-xl text-[13px] font-medium mb-4" role="alert">{state.error}</div>
      )}
      <div className="mb-4">
        <label className={LBL} htmlFor="login-email">И-мэйл</label>
        <input id="login-email" type="email" name="email" defaultValue={state.email} placeholder="name@email.com" required autoFocus autoComplete="username" className={INP} />
      </div>
      <div className="mb-5">
        <label className={LBL} htmlFor="login-password">Нууц үг</label>
        <input id="login-password" type="password" name="password" placeholder="••••••••" required autoComplete="current-password" className={INP} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded-xl bg-primary-ink text-white dark:bg-primary dark:text-[#1f1a17] font-bold text-[15px] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Шалгаж байна...' : 'Нэвтрэх →'}
      </button>
    </form>
  );
}
