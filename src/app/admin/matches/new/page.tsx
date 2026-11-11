import { requireRole } from '@/lib/auth';
import MatchForm from '../MatchForm';

export const metadata = { title: 'Шинэ тоглолт' };

type SP = { season_id?: string; home?: string; away?: string; stage?: string; game_no?: string };

export default async function NewMatch({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole(['admin', 'commissioner']);
  const sp = await searchParams;
  const num = (v?: string) => parseInt(v ?? '', 10) || undefined;
  // Плейоффын сүлжээнээс "Тоглолт нэмэх" дарахад багууд, шат урьдчилан бөглөгдөнө
  const preset = {
    home: num(sp.home),
    away: num(sp.away),
    stage: sp.stage === 'playoff' ? 'playoff' : undefined,
    game_no: num(sp.game_no),
  };
  return <MatchForm user={user} seasonId={num(sp.season_id) ?? 0} preset={preset} />;
}
