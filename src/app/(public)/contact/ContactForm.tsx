'use client';

import { useActionState, useState } from 'react';
import { sendContact, type ContactState } from './actions';

const SUBJECTS = ['Лиг нэмэх хүсэлт', 'Техникийн асуулт', 'Алдаа мэдэгдэх', 'Хамтран ажиллах', 'Бусад'];
const INP = 'w-full rounded-lg border border-line2 bg-surface px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary focus:ring-0 transition-colors';
const LBL = 'block text-[10px] font-medium uppercase tracking-widest text-muted mb-2';

export default function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { sent: false, error: '', values: {} });
  const [key, setKey] = useState(0);

  if (state.sent && key === 0)
    return (
      <div className="text-center py-10">
        <span className="material-icons-round text-4xl text-primary block mb-4">check_circle</span>
        <h3 className="font-display text-2xl mb-3 uppercase">Амжилттай!</h3>
        <p className="text-ink2 mb-7">Таны мессеж хүлээн авлаа. Удахгүй холбоо барина.</p>
        <button type="button" onClick={() => setKey(1)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-primary hover:opacity-90 transition-opacity">
          <span className="material-icons-round text-lg">refresh</span> Дахин илгээх
        </button>
      </div>
    );

  const v = state.values;
  return (
    <>
      <h2 className="font-medium text-[13px] uppercase tracking-[0.14em] text-muted mb-6">Мессеж илгээх</h2>
      {state.error && (
        <div className="mb-5 px-4 py-3 rounded-lg text-sm text-live border border-live/30">
          <span className="material-icons-round text-base align-middle mr-1">error</span>
          {state.error}
        </div>
      )}
      <form action={(fd) => { setKey(0); action(fd); }} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={LBL}>Таны нэр <span className="text-live">*</span></label>
            <input type="text" name="name" defaultValue={v.name} placeholder="Овог Нэр" className={INP} />
          </div>
          <div>
            <label className={LBL}>И-мэйл <span className="text-live">*</span></label>
            <input type="email" name="email" defaultValue={v.email} placeholder="example@mail.com" className={INP} />
          </div>
        </div>
        <div>
          <label className={LBL}>Сэдэв</label>
          <select name="subject" defaultValue={v.subject} className={INP}>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LBL}>Мессеж <span className="text-live">*</span></label>
          <textarea name="message" rows={6} defaultValue={v.message} placeholder="Мессежээ энд бичнэ үү..." className={`${INP} resize-none`} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-medium text-white text-sm bg-primary hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <span className="material-icons-round text-lg">send</span> {pending ? 'Илгээж байна...' : 'Илгээх'}
        </button>
      </form>
    </>
  );
}
