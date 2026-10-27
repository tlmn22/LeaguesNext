-- PostgreSQL indexes used by LeagueMN.
CREATE INDEX IF NOT EXISTS idx_mps_match ON public.match_player_stats (match_id);
CREATE INDEX IF NOT EXISTS idx_mps_player ON public.match_player_stats (player_id);
CREATE INDEX IF NOT EXISTS idx_mps_team ON public.match_player_stats (team_id);
CREATE INDEX IF NOT EXISTS idx_ms_user ON public.match_submit (user_id);
CREATE INDEX IF NOT EXISTS idx_ms_status ON public.match_submit (status);
CREATE INDEX IF NOT EXISTS idx_matches_datetime ON public.matches (match_datetime);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches (status);
CREATE INDEX IF NOT EXISTS idx_sma_user ON public.stat_manager_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_wt_user_id ON public.wallet_transactions (user_id, id);
