'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

/** Илгээх товч — илгээж байх үед идэвхгүй */
export function Submit({ children, className, pendingText = 'Хадгалж байна...', confirm: confirmMsg }: { children: ReactNode; className?: string; pendingText?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirmMsg && !window.confirm(confirmMsg)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/** Баталгаажуулалттай жижиг товч (устгах гэх мэт) — <form action={...}> дотор */
export function ConfirmButton({ message, className, title, children }: { message: string; className?: string; title?: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Зураг сонгоход урьдчилан харуулна */
export function ImageInput({ name, current, className = 'h-14 rounded-lg border border-line mt-2.5' }: { name: string; current?: string | null; className?: string }) {
  const [src, setSrc] = useState<string | null>(current ?? null);
  return (
    <div>
      <input
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setSrc(URL.createObjectURL(f));
        }}
        className="block w-full text-sm text-ink2 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-line2 file:bg-surface file:text-ink2 file:text-xs file:cursor-pointer"
      />
      {src && <img src={src} alt="" className={className} />}
    </div>
  );
}

/** Өнгө сонгогч + hex талбар */
export function ColorInput({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [v, setV] = useState(defaultValue);
  return (
    <div className="flex items-center gap-2">
      <input type="color" name={name} value={v} onChange={(e) => setV(e.target.value)} className="w-11 h-[38px] rounded-lg border border-line2 bg-surface cursor-pointer p-0.5" />
      <input
        type="text"
        value={v}
        maxLength={7}
        onChange={(e) => setV(e.target.value)}
        className="w-full bg-surface border border-line2 rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-primary focus:ring-0 font-mono text-xs"
      />
    </div>
  );
}

/** Энгийн modal — trigger товч дарахад нээгдэнэ */
export function Modal({
  trigger,
  triggerClass,
  title,
  children,
  wide,
  disabled,
}: {
  trigger: ReactNode;
  triggerClass: string;
  title: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  wide?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <button type="button" className={triggerClass} disabled={disabled} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        className={`m-auto bg-surface text-ink border border-line2 rounded-xl p-0 w-[calc(100%-2rem)] ${wide ? 'max-w-2xl' : 'max-w-md'} backdrop:bg-black/60`}
        onClick={(e) => e.target === ref.current && close()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-display text-lg uppercase tracking-wide">{title}</h3>
          <button type="button" onClick={close} className="text-muted hover:text-ink" aria-label="Хаах">
            <span className="material-icons-round">close</span>
          </button>
        </div>
        <div className="p-5">{typeof children === 'function' ? children(close) : children}</div>
      </dialog>
    </>
  );
}

type FlashMsg = { type: 'success' | 'danger' | 'warning' | 'info'; message: string };

/** Server action-ийн тавьсан flash cookie-г уншиж харуулна */
export function Flash() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [msg, setMsg] = useState<FlashMsg | null>(null);

  useEffect(() => {
    const m = document.cookie.split('; ').find((c) => c.startsWith('lm_flash='));
    if (!m) return;
    let raw = m.slice('lm_flash='.length);
    for (let i = 0; i < 3; i++) {
      try {
        setMsg(JSON.parse(raw));
        break;
      } catch {
        try {
          raw = decodeURIComponent(raw);
        } catch {
          break;
        }
      }
    }
    document.cookie = 'lm_flash=; Max-Age=0; path=/';
    const t = setTimeout(() => setMsg(null), 6000);
    return () => clearTimeout(t);
  }, [pathname, sp]);

  if (!msg) return null;
  const cls =
    msg.type === 'success'
      ? 'bg-open/10 text-open border-open/30'
      : msg.type === 'danger'
        ? 'bg-live/10 text-live border-live/30'
        : msg.type === 'warning'
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
          : 'bg-reg/10 text-reg border-reg/30';
  return (
    <div className={`flex items-center justify-between gap-3 mb-5 px-4 py-3 rounded-lg text-sm border ${cls}`} role="status">
      <span>{msg.message}</span>
      <button type="button" onClick={() => setMsg(null)} className="opacity-60 hover:opacity-100" aria-label="Хаах">
        &times;
      </button>
    </div>
  );
}

/** Хайлттай сонголт (баг, тоглогч сонгох) */
export function SearchPick({
  name,
  options,
  placeholder = 'Нэрээр хайх...',
  required,
}: {
  name: string;
  options: { id: number; label: string; meta?: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<number | null>(null);
  const ql = q.trim().toLowerCase();
  const list = ql ? options.filter((o) => o.label.toLowerCase().includes(ql)) : options;
  return (
    <div>
      <input type="hidden" name={name} value={sel ?? ''} required={required} />
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setSel(null);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-bg border border-line2 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary focus:ring-0"
      />
      <div className="max-h-56 overflow-y-auto border border-line2 rounded-lg mt-1.5">
        {list.slice(0, 200).map((o) => (
          <button
            type="button"
            key={o.id}
            onClick={() => {
              setSel(o.id);
              setQ(o.label);
            }}
            className={`w-full text-left px-3 py-2 text-sm border-b border-line last:border-0 flex justify-between gap-2 ${sel === o.id ? 'bg-primary text-white' : 'hover:bg-raise'}`}
          >
            <span className="truncate">{o.label}</span>
            {o.meta && <span className={`text-xs shrink-0 ${sel === o.id ? 'text-white/80' : 'text-muted'}`}>{o.meta}</span>}
          </button>
        ))}
        {list.length === 0 && <div className="px-3 py-3 text-center text-sm text-muted">Илэрц олдсонгүй</div>}
      </div>
      {required && !sel && <p className="text-[11px] text-muted mt-1">Жагсаалтаас сонгоно уу</p>}
    </div>
  );
}

/** Admin sidebar — mobile дээр нээгддэг */
export function SidebarShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-surface border-r border-line flex flex-col transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebar}
      </aside>
      {open && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setOpen(false)} />}
      <div className="md:ml-60 min-h-screen flex flex-col">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="md:hidden fixed top-3 left-3 z-30 w-9 h-9 grid place-items-center rounded-lg border border-line2 bg-surface text-ink2"
          aria-label="Цэс"
        >
          <span className="material-icons-round text-xl">menu</span>
        </button>
        {children}
      </div>
    </>
  );
}

export function NavLink({ href, icon, label, count }: { href: string; icon: string; label: string; count?: number | string | null }) {
  const pathname = usePathname();
  const active = href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`mx-3 flex items-center gap-2.5 px-3 h-9 rounded-lg text-[14px] font-semibold transition-colors ${
        active ? 'text-primary-ink bg-primary/10' : 'text-ink2 hover:text-ink hover:bg-bg'
      }`}
    >
      <span className="material-icons-round text-[18px] w-5 text-center">{icon}</span>
      <span className="flex-1">{label}</span>
      {count != null && count !== '' && <span className={`text-[11px] font-medium tabular-nums ${active ? 'text-primary-ink' : 'text-muted'}`}>{count}</span>}
    </Link>
  );
}
