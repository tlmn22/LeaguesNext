'use client';

export default function ThemeToggle() {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('lm-theme', dark ? 'dark' : 'light');
    } catch {}
  };
  return (
    <button type="button" onClick={toggle} title="Өнгөний горим" className="lmn-btn lmn-btn-icon">
      <span className="mi dark:hidden" aria-hidden="true">dark_mode</span>
      <span className="mi hidden dark:inline-block" aria-hidden="true">light_mode</span>
      <span className="sr">Өнгөний горим солих</span>
    </button>
  );
}
