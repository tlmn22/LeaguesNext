import { redirect } from 'next/navigation';

// Хуучин "Улирлын багууд" модуль → улирлын дэлгэрэнгүй хуудасны "Багууд" tab руу нэгтгэсэн
export default async function SeasonTeamsIndex({ searchParams }: { searchParams: Promise<{ season_id?: string }> }) {
  const sid = parseInt((await searchParams).season_id ?? '', 10) || 0;
  redirect(sid ? `/admin/seasons/${sid}?tab=teams` : '/admin/seasons');
}
